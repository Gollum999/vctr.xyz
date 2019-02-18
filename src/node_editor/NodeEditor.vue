<template>
  <!-- NOTE: This dblclick listener is only to prevent the default dblclick zoom in Rete -->
  <div class="node-editor" @dblclick.capture.stop="">
    <div class="rete" id="rete" />

    <div class="buttons-add-nodes">
      <md-button class="md-icon-button md-dense md-raised" type="button" title="Add scalar" @click="addNode('scalar')">
        <md-icon class="custom-icon" md-src="/static/scalar.svg"></md-icon>
      </md-button>
      <md-button class="md-icon-button md-dense md-raised" type="button" title="Add vector" @click="addNode('vector')">
        <md-icon class="custom-icon" md-src="/static/vector.svg"></md-icon>
      </md-button>
      <md-button class="md-icon-button md-dense md-raised" type="button" title="Add matrix" @click="addNode('matrix')" disabled>
        <md-icon class="custom-icon" md-src="/static/matrix.svg"></md-icon>
      </md-button>
      <md-button class="md-icon-button md-dense md-raised" type="button" title="Add vector operation" @click="addNode('operation')">
        <md-icon class="custom-icon" md-src="/static/operation.svg"></md-icon>
      </md-button>
    </div>

    <div class="buttons-delete-nodes">
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
</template>

<script>
import Rete from 'rete';
import ConnectionPlugin from 'rete-connection-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import allComponents from './components';
// import { Engine, ComponentWorker } from 'rete/build/rete-engine.min'
import { vec3 } from 'gl-matrix';
import contextMenu from 'vue-context-menu';
import { EventBus } from '../EventBus';

export default {
    name: 'NodeEditor',
    components: {
        contextMenu,
    },
    data() {
        return {
            version: 'vecviz@0.1.0', // Make sure to update this if introducing changes that would break saved node editor state
            newNodePosition: [50, 50],
            container: null,
            editor: null,
            engine: null,
            minZoom: 0.1,
            maxZoom: 3,
            components: {
                'scalar':        new allComponents.ScalarComponent(),
                'add':           new allComponents.AddComponent(),
                'vec':           new allComponents.VectorComponent(),
                'vec_operation': new allComponents.VectorOperationComponent(),
            },
        };
    },

    methods: {
        async addNode(nodeType) {
            console.log(`Add node (type ${nodeType})`);

            var node = null;
            switch (nodeType) {
            case 'scalar':
                node = await this.components['scalar'].createNode({'numctl': 0});
                break;
            case 'vector':
                node = await this.components['vec'].createNode({'vecctl': vec3.fromValues(0, 0, 0)});
                break;
            case 'operation':
                node = await this.components['vec_operation'].createNode();
                break;
            default:
                throw new Error(`Cannot add node of type ${nodeType}`);
            }

            node.position = this.newNodePosition.slice();
            const nodeEditorWidth = this.editor.view.container.parentElement.parentElement.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement.parentElement.clientHeight;
            const nodeOffset = 20;
            const wrapMargin = 50;
            this.newNodePosition[0] = (this.newNodePosition[0] + nodeOffset) % (nodeEditorWidth - wrapMargin);
            this.newNodePosition[1] = (this.newNodePosition[1] + nodeOffset) % (nodeEditorHeight - wrapMargin);

            this.editor.addNode(node);
        },

        deleteNode() {
            this.editor.selected.each(node => {
                this.editor.removeNode(node);
            });
        },

        recenterView() {
            this.editor.view.area.transform = { k: 1, x: 0, y: 0 }; // TODO dynamic view sizing based on bounds of current nodes
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
                console.log('Loading node editor from local storage');
                console.log(savedEditorJson);
                const success = await this.editor.fromJSON(savedEditorJson);
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
                this.components['scalar'].createNode({'numctl': 5}),
                this.components['scalar'].createNode({'numctl': 4}),
                this.components['add'].createNode(),
                this.components['vec'].createNode({'vecctl': vec3.fromValues(3, 2, 1)}),
                this.components['vec'].createNode({'vecctl': vec3.fromValues(2, 2, 2)}),
                this.components['vec_operation'].createNode(),
                this.components['vec'].createNode({'vecctl': vec3.fromValues(2, 2, 2)}),
            ]);
            in1.position = [20, 20];
            in2.position = [20, 170];
            out.position = [180, 75];
            vec.position = [320, 75];
            vec2.position = [320, 230];
            vecOp.position = [560, 75];
            vecOut.position = [740, 75];

            this.editor.addNode(in1);
            this.editor.addNode(in2);
            this.editor.addNode(out);
            this.editor.addNode(vec);
            this.editor.addNode(vec2);
            this.editor.addNode(vecOp);
            this.editor.addNode(vecOut);

            this.editor.connect(in1.outputs.get('scalar'), out.inputs.get('num1'));
            this.editor.connect(in2.outputs.get('scalar'), out.inputs.get('num2'));
            this.editor.connect(vec.outputs.get('vec'), vecOp.inputs.get('vec1'));
            this.editor.connect(vec2.outputs.get('vec'), vecOp.inputs.get('vec2'));
            this.editor.connect(vecOp.outputs.get('vec'), vecOut.inputs.get('vec'));
        },

        async handleEngineProcess() {
            console.log('NodeEditor handleEngineProcess');
            console.log(this.editor.toJSON());
            await this.engine.abort(); // Stop old job if running
            await this.engine.process(this.editor.toJSON());

            // TODO should I save during more events?
            console.log('Saving editor state to browser-local storage');
            window.localStorage.setItem('node_editor', JSON.stringify(this.editor.toJSON()));

            this.$emit('process', this.editor.toJSON());
            this.$root.$emit('node_engine_processed', this.editor.toJSON());
        },
    },

    mounted() {
        EventBus.$on('split-resized', () => {
            this.editor.view.resize();
        });
        this.container = document.getElementById('rete');
        this.editor = new Rete.NodeEditor(this.version, this.container);

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin);

        this.engine = new Rete.Engine(this.version);

        Object.keys(this.components).map(key => {
            this.editor.register(this.components[key]);
            this.engine.register(this.components[key]);
        });

        this.editor.on('process nodecreated noderemoved connectioncreated connectionremoved', this.handleEngineProcess);

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

        (async () => { this.loadNodes(); })();

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
  .buttons-add-nodes
    position: absolute
    left: 5px
    top: 12px
  .buttons-delete-nodes
    position: absolute
    right: 5px
    top: 12px
.rete
  display: block
  height: 100%
  min-height: 100vh
  border: 2px solid #dddddd
  background-color: #bbbbbb
.split
  overflow-y: hidden
</style>
