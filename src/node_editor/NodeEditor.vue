<template>
  <!-- NOTE: This dblclick listener is only to prevent the default dblclick zoom in Rete -->
  <div class="node-editor" @dblclick.capture.stop>
    <div class="rete" id="rete" />

    <div class="buttons-container">
      <div class="buttons-group buttons-add-nodes">
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Add scalar" @click="addNode('scalar')">
          <md-icon class="custom-icon" :md-src="require('@/assets/scalar.svg')" />
        </md-button>
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Add vector" @click="addNode('vector')">
          <md-icon class="custom-icon" :md-src="require('@/assets/vector.svg')" />
        </md-button>
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Add matrix" @click="addNode('matrix')">
          <md-icon class="custom-icon" :md-src="require('@/assets/matrix.svg')" />
        </md-button>
        <!-- TODO not sure why "auto" size seems truncated on the right (possibly doesn't take scroll bar width into account) -->
        <!-- TODO dosen't seem to support a "dense" mode like md-select does -->
        <md-menu md-size="medium" md-align-trigger>
          <!-- TODO I think I'm going to want to split operations into categories: maybe 'basic', 'matrix', 'trig'? -->
          <md-button class="md-icon-button md-dense md-raised" type="button" title="Add basic operation" md-menu-trigger>
            <md-icon class="custom-icon" :md-src="require('@/assets/operation.svg')" />
          </md-button>

          <md-menu-content>
            <md-menu-item @click="addNode('operation-add')">Add</md-menu-item>
            <md-menu-item @click="addNode('operation-subtract')">Subtract</md-menu-item>
            <md-menu-item @click="addNode('operation-multiply')">Multiply</md-menu-item>
            <md-menu-item @click="addNode('operation-divide')">Divide</md-menu-item>
            <md-menu-item @click="addNode('operation-dot')">Dot Product</md-menu-item>
            <md-menu-item @click="addNode('operation-cross')">Cross Product</md-menu-item>
          </md-menu-content>
        </md-menu>
      </div>

      <span class="buttons-group buttons-spacer" />

      <div class="buttons-group buttons-history">
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Undo" @click="onUndo">
          <md-icon>undo</md-icon>
        </md-button>
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Redo" @click="onRedo">
          <md-icon>redo</md-icon>
        </md-button>
      </div>

      <span class="buttons-group buttons-spacer" />

      <div class="buttons-group buttons-delete-nodes">
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Recenter view" @click="recenterView">
          <md-icon>center_focus_weak</md-icon>
        </md-button>
        <md-button class="md-icon-button md-dense md-raised" type="button" title="Clear all nodes" @click="clearAllNodes">
          <md-icon>delete</md-icon>
        </md-button>
      </div>

      <context-menu id="context-menu" ref="ctxMenu">
        <li class="ctx-item" @click="deleteNode">Delete</li>
      </context-menu>
    </div>
  </div>
</template>

<script>
import Rete from 'rete';
import ConnectionPlugin from 'rete-connection-plugin';
import HistoryPlugin from 'rete-history-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import allComponents from './components';
// import { Engine, ComponentWorker } from 'rete/build/rete-engine.min'
import contextMenu from 'vue-context-menu';
import { EventBus } from '../EventBus';
import settings from '../settings';

// TODO is there a library for this?
class Rect {
    constructor({top, left, right, bottom}) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
    }

    width() {
        return this.right - this.left;
    }

    height() {
        return this.bottom - this.top;
    }

    midpoint() {
        return [this.left + (this.width() / 2), this.top + (this.height() / 2)];
    }

    grow(padding) {
        this.top -= padding;
        this.bottom += padding;
        this.left -= padding;
        this.right += padding;
    }

    union(other) {
        return new Rect({
            top: Math.min(this.top, other.top),
            left: Math.min(this.left, other.left),
            right: Math.max(this.right, other.right),
            bottom: Math.max(this.bottom, other.bottom),
        });
    }
}

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

export default {
    name: 'NodeEditor',
    components: {
        contextMenu,
    },
    data() {
        return {
            version: 'vecviz@0.1.0', // Make sure to update this if introducing changes that would break saved node editor state
            // TODO how to use the defaults defined in SettingsModal?  I think I either have to pass them down as props, or just define them in some common location
            settings: settings.defaultSettings['node_editor_settings'],
            lastNodePosition: null,
            newNodesShouldBeCentered: true,
            container: null,
            editor: null,
            engine: null,
            minZoom: 0.1,
            maxZoom: 3,
            components: {
                'scalar':             new allComponents.ScalarComponent(),
                'vector':             new allComponents.VectorComponent(),
                'matrix':             new allComponents.MatrixComponent(),

                'operation-add':      new allComponents.BasicOperationComponent('ADD'),
                'operation-subtract': new allComponents.BasicOperationComponent('SUBTRACT'),
                'operation-multiply': new allComponents.BasicOperationComponent('MULTIPLY'),
                'operation-divide':   new allComponents.BasicOperationComponent('DIVIDE'),
                'operation-dot':      new allComponents.BasicOperationComponent('DOT'),
                'operation-cross':    new allComponents.BasicOperationComponent('CROSS'),
                'add_old':            new allComponents.AddComponent(),
            },
        };
    },

    methods: {
        async addNode(nodeType) {
            console.log(`Add node (type ${nodeType})`);

            var node = null;
            switch (nodeType) {
            case 'scalar':
                node = await this.components['scalar'].createNode({'value': 0});
                break;
            case 'vector':
                node = await this.components['vector'].createNode({'value': [0, 0, 0]});
                break;
            case 'matrix':
                node = await this.components['matrix'].createNode({'value': [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ]});
                break;
            case 'operation-add':
            case 'operation-subtract':
            case 'operation-multiply':
            case 'operation-divide':
            case 'operation-dot':
            case 'operation-cross':
                node = await this.components[nodeType].createNode();
                break;
            default:
                throw new Error(`Cannot add node of type ${nodeType}`);
            }

            this.editor.addNode(node);
            const nodeView = this.editor.view.nodes.get(node);

            node.position = this.getNewNodePos(node, nodeView);
            console.log('Added node at position', node.position);

            // Normally addNode triggers this update, but since I updated the position *after* adding the node, I need to do it manually
            // TODO: If this causes any performance issues, I can cache node sizes per type so we only need to manually update the first time
            //       a certain type is created
            nodeView.update();

            this.newNodesShouldBeCentered = false;
            this.lastNodePosition = node.position.slice();
        },

        getNewNodePos(node, nodeView) {
            const editorX = this.editor.view.area.transform.x;
            const editorY = this.editor.view.area.transform.y;
            const nodeEditorWidth = this.editor.view.container.parentElement.parentElement.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement.parentElement.clientHeight;
            const editorScale = this.editor.view.area.transform.k;
            const nodeWidth = nodeView.el.offsetWidth;
            const nodeHeight = nodeView.el.offsetHeight;
            if (this.newNodesShouldBeCentered) {
                const nodeEditorCenterX = nodeEditorWidth / 2;
                const nodeEditorCenterY = nodeEditorHeight / 2;
                const desiredPosX = ((nodeEditorCenterX - editorX) / editorScale) - nodeWidth / 2;
                const desiredPosY = ((nodeEditorCenterY - editorY) / editorScale) - nodeHeight / 2;
                return [desiredPosX, desiredPosY];
            } else {
                const nodeOffset = 30;
                const wrapMargin = 30;
                const editorViewRect = new Rect({
                    top: -editorY / editorScale,
                    left: -editorX / editorScale,
                    right: (nodeEditorWidth - editorX) / editorScale,
                    bottom: (nodeEditorHeight - editorY) / editorScale,
                });
                editorViewRect.grow(-wrapMargin);
                editorViewRect.right -= nodeWidth;
                editorViewRect.bottom -= nodeHeight;
                const xRelativeToView = this.lastNodePosition[0] + nodeOffset - editorViewRect.left;
                const yRelativeToView = this.lastNodePosition[1] + nodeOffset - editorViewRect.top;
                const desiredPosX = editorViewRect.left + xRelativeToView % editorViewRect.width();
                const desiredPosY = editorViewRect.top + yRelativeToView % editorViewRect.height();
                return [desiredPosX, desiredPosY];
            }
        },

        deleteNode() {
            this.editor.selected.each(node => {
                this.editor.removeNode(node);
            });
        },

        onUndo() {
            console.log('UNDO');
            try {
                /* console.log('before trigger undo', this.editor.plugins); */
                this.editor.trigger('undo');
                /* console.log('after trigger undo'); */
            } catch (error) {
                console.warn('caught error in undo event', error);
            }
        },

        onRedo() {
            console.log('REDO');
            this.editor.trigger('redo');
        },

        recenterView() {
            let viewRect = null;
            for (const [node, nodeView] of this.editor.view.nodes) {
                // These values are in editor space, not screen space
                const nodeRect = new Rect({
                    top: node.position[1],
                    left: node.position[0],
                    right: node.position[0] + nodeView.el.offsetWidth,
                    bottom: node.position[1] + nodeView.el.offsetHeight,
                });
                if (viewRect) {
                    viewRect = viewRect.union(nodeRect);
                } else {
                    viewRect = nodeRect;
                }
            }
            if (viewRect === null) {
                return;
            }
            const padding = 30;
            viewRect.grow(padding);

            const [editorMidpointX, editorMidpointY] = viewRect.midpoint(); // In editor space, not screen space
            const nodeEditorWidth = this.editor.view.container.parentElement.parentElement.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement.parentElement.clientHeight;
            const widthRatio = nodeEditorWidth / viewRect.width();
            const heightRatio = nodeEditorHeight / viewRect.height();
            const scale = clamp(Math.min(widthRatio, heightRatio), this.minZoom, this.maxZoom); // Determine how far we should zoom in/out to fit everything

            // x/y here is in screen space
            this.editor.view.area.transform = {
                k: scale,
                x: (nodeEditorWidth / 2) - (editorMidpointX * scale),
                y: (nodeEditorHeight / 2) - (editorMidpointY * scale),
            };
            console.log('recenterView set view transform to:', this.editor.view.area.transform);
            this.editor.view.area.update();
        },

        clearAllNodes() {
            console.log('clearAllNodes');
            if (window.confirm('Are you sure you want to clear all nodes?')) {
                this.editor.clear();
            }
        },

        async loadNodes() {
            // const savedEditorJson = null;
            const savedEditorJson = JSON.parse(window.localStorage.getItem('node_editor'));

            if (savedEditorJson) {
                console.log('LOADING:', savedEditorJson);
                const success = await this.editor.fromJSON(savedEditorJson);
                console.log('LOADED:', this.editor);
                if (!success) {
                    console.log('Could not load from local storage, creating demo nodes instead');
                    await this.createDemoNodes();
                }
            } else {
                console.log('Creating demo nodes');
                await this.createDemoNodes();
            }
        },

        async createDemoNodes() {
            const [in1, in2, out, vec, vec2, vecOp, vecOut] = await Promise.all([
                this.components['scalar'].createNode({ 'value': 5 }),
                this.components['scalar'].createNode({ 'value': 4 }),
                this.components['add_old'].createNode(),
                this.components['vector'].createNode({ 'value': [3, 2, 1], 'color': { hex: '#00ffff' } }),
                this.components['vector'].createNode({ 'value': [2, 2, 2], 'color': { hex: '#00ffff' } }),
                this.components['operation-add'].createNode(),
                this.components['vector'].createNode({ 'value': [2, 2, 2] }),
            ]);
            in1.position = [20, 40];
            in2.position = [20, 150];
            out.position = [180, 75];
            vec.position = [320, 40];
            vec2.position = [320, 200];
            vecOp.position = [590, 120];
            vecOut.position = [720, 100];

            this.editor.addNode(in1);
            this.editor.addNode(in2);
            this.editor.addNode(out);
            this.editor.addNode(vec);
            this.editor.addNode(vec2);
            this.editor.addNode(vecOp);
            this.editor.addNode(vecOut);

            this.editor.connect(in1.outputs.get('scalar'), out.inputs.get('scalar1'));
            this.editor.connect(in2.outputs.get('scalar'), out.inputs.get('scalar2'));
            this.editor.connect(vec.outputs.get('vector'), vecOp.inputs.get('lhs'));
            this.editor.connect(vec2.outputs.get('vector'), vecOp.inputs.get('rhs'));
            this.editor.connect(vecOp.outputs.get('result'), vecOut.inputs.get('vector'));
        },

        saveState() {
            console.log('Saving editor state to browser-local storage', this.editor.toJSON());
            window.localStorage.setItem('node_editor', JSON.stringify(this.editor.toJSON()));
            window.localStorage.setItem('node_editor_view_transform', JSON.stringify(this.editor.view.area.transform));
        },

        async loadState() {
            console.log('Loading node editor from local storage');

            const viewTransform = JSON.parse(window.localStorage.getItem('node_editor_view_transform'));
            if (viewTransform) {
                this.editor.view.area.transform = viewTransform;
                this.editor.view.area.update();
            }

            await this.loadNodes();
        },

        async handleEngineProcess() {
            console.log('NodeEditor handleEngineProcess', this.editor.toJSON());
            await this.engine.abort(); // Stop old job if running // TODO this is not syncronized with other invocations of handleEngineProcess
            await this.engine.process(this.editor.toJSON());

            // TODO should I save during more events?
            this.saveState();

            this.$emit('process', this.editor.toJSON());
            this.$root.$emit('node_engine_processed', this.editor.toJSON());
        },
    },

    mounted() {
        this.settings = settings.loadSettings('node_editor_settings');
        EventBus.$on('settings-updated', () => { this.settings = settings.loadSettings('node_editor_settings'); });
        // console.log('NodeEditor loaded settings', this.settings);

        EventBus.$on('split-resized', () => {
            this.editor.view.resize();
        });
        this.container = document.getElementById('rete');
        this.editor = new Rete.NodeEditor(this.version, this.container);

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin);
        console.log('NodeEditor mounted, plugins list:', this.editor.plugins);
        console.log('NodeEditor mounted, events:', this.editor.events);
        // console.log('NodeEditor mounted, connectionremoved:', this.editor.events['connectionremoved']);
        // console.log('NodeEditor mounted, connectionremoved handlers:', this.editor.events['connectionremoved'].handlers);

        this.engine = new Rete.Engine(this.version);

        Object.keys(this.components).map(key => {
            this.editor.register(this.components[key]);
            this.engine.register(this.components[key]);
        });

        (async () => {
            await this.loadState();

            // Don't set up undo/redo callbacks until after finished loading to prevent user from undoing load
            this.editor.use(HistoryPlugin, { keyboard: true });

            // Don't trigger any of these events until after the initial load is done
            // TODO still not perfect, doesn't prevent multiple changes from user getting queued up; is there something like Java's 'synchronized' keyword?
            this.editor.on('process nodecreated noderemoved connectioncreated connectionremoved', this.handleEngineProcess);
            this.editor.trigger('process'); // Process at least once to make sure the viewports are updated // TODO figure out where this really belongs; the order of events here is not very clear
        })();

        this.editor.on('nodecreated', node => {
            Array.prototype.map.call(document.getElementsByClassName('node'), nodeView => {
                nodeView.addEventListener('contextmenu', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.$refs.ctxMenu.open(event, {node: node, nodeView: nodeView});
                });
            });
        });

        this.editor.on('zoom', ({transform, zoom, source}) => {
            return (this.minZoom <= zoom && zoom <= this.maxZoom);
        });

        this.editor.on('translated zoomed', () => {
            this.newNodesShouldBeCentered = true;
        });

        this.engine.on('error', ({message, data}) => {
            const msg = `Error in Rete engine: ${message}`;
            alert(msg);
            console.error(msg);
            console.info(data);
        });

        // this.engine.on('warn', (exc) => {
        //     console.warn(`Warning from Rete engine`);
        //     console.warn(exc);
        // });

        this.editor.view.resize();
        this.editor.trigger('process');

        this.$nextTick(() => {
            // For some reason the initial render has a scroll bar, so need to force resize again to take up whole container
            this.editor.view.resize();
        });
    },
};
</script>

<style lang="sass">
/* Global overrides for Rete style */
#app
  .node
    .control
      padding: 8px // TODO doesn't work because of display: contents
    .input-title
      margin: 2px
    .output-title
      margin: 2px

  .connection
    /* Fix display bug with connections */
    /* TODO I think something with bootstrap causes the svg element to be aligned to center */
    position: absolute
    left: 0px
    z-index: -5
    .main-path
      stroke: black
      stroke-width: 3px

  .socket
    width: 14px
    height: 14px
    &.input
      margin-left: -8px
    &.output
      margin-right: -8px
    &.scalar-value
      background: #7777dd
    &.vector-value
      background: #ff4444
    &.matrix-value
      background: #44ffff
    &.scalar-or-vector
      background: #bb5d90 // TODO is there a more graceful way to have a "fallback" style?  media query?
      background: linear-gradient(180deg, #7777dd 50%, #ff4444 50%)
    &.scalar-or-matrix
      background: #5dbbee
      background: linear-gradient(180deg, #7777dd 50%, #44ffff 50%)
    &.vector-or-matrix
      background: #a1a1a1
      background: linear-gradient(180deg, #ff4444 50%, #44ffff 50%)
    &.anything
      background: #aaaaaa
      background: linear-gradient(180deg, #7777dd 34%, #ff4444 34% 66%, #44ffff 66%)
      background: conic-gradient(#7777dd 120deg, #ff4444 120deg 240deg, #44ffff 240deg 360deg)
  .custom-icon
    svg
      position: absolute // TODO: necessary to get icon positioned properly in button
      top: 0px
      left: 0px
</style>

<style lang="sass" scoped>
.node-editor
  height: 100%; /* Make sure container is large enough when split is fully expanded */
  position: relative
  display: block
  width: 100%
  min-height: 100px
  overflow-y: hidden
  .buttons-container
    display: flex
    position: absolute
    left: 5px
    top: 12px
    right: 5px
    .buttons-spacer
      flex-grow: 1
.rete
  display: block
  height: 100%
  min-height: 100vh
  border: 2px solid #dddddd
  background-color: #bbbbbb
.split
  overflow-y: hidden
</style>
