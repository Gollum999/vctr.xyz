<template>
  <!-- NOTE: This dblclick listener is only to prevent the default dblclick zoom in Rete -->
  <div class="node-editor" @dblclick.capture.stop="">
    <div class="rete" id="rete" />

    <div class="buttons-add-nodes">
      <md-button class="md-raised add-scalar" type="button" @click="addNode('scalar')">Add Scalar</md-button>
      <md-button class="md-raised add-vector" type="button" @click="addNode('vector')">Add Vector</md-button>
      <md-button class="md-raised add-operation" type="button" @click="addNode('operation')">Add Operation</md-button>
    </div>

    <div class="buttons-delete-nodes">
      <md-button class="md-raised recenter-camera" type="button" @click="recenterView">Recenter</md-button>
      <md-button class="md-raised clear-nodes" type="button" @click="clearAllNodes">Clear</md-button>
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
            console.log('deleteNode');
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
            /* const savedEditorJson = null; */
            const savedEditorJson = JSON.parse(window.localStorage.getItem('node_editor'));

            if (savedEditorJson) {
                console.log('Loading node editor from local storage');
                console.log(savedEditorJson);
                await this.editor.fromJSON(savedEditorJson);
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
            console.log('Calling engine.process()');
            await this.engine.process(this.editor.toJSON());

            // TODO should I save during more events?
            console.log('Saving editor state to browser-local storage');
            window.localStorage.setItem('node_editor', JSON.stringify(this.editor.toJSON()));

            this.$emit('process', this.editor.toJSON());
            this.$root.$emit('node_engine_processed', this.editor.toJSON());
        },
    },

    mounted() {
        console.log('NodeEditor.vue mounted()');
        EventBus.$on('split-resized', () => {
            this.editor.view.resize();
        });
        this.container = document.getElementById('rete');
        this.editor = new Rete.NodeEditor('name@0.1.0', this.container);

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin);

        this.engine = new Rete.Engine('name@0.1.0');

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

        this.engine.on('warn', (exc) => {
            console.warn(`Warning from Rete engine`);
            console.warn(exc);
        });

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
    top: 5px
  .buttons-delete-nodes
    position: absolute
    right: 5px
    top: 5px
.rete
  display: block
  height: 100%
  min-height: 100vh
  border: 2px solid #dddddd
  background-color: #bbbbbb
.split
  overflow-y: hidden
</style>
