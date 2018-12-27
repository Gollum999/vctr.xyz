<template>
  <div class="node-editor">
    <div class="rete" id="rete" />

    <div class="buttons">
      <input class="add-input" type="button" value="Add Input" @click="addNode('input')" />
      <input class="add-operation" type="button" value="Add Operation" @click="addNode('operation')" />
      <input class="add-output" type="button" value="Add Output" @click="addNode('output')" />
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

export default {
    name: 'NodeEditor',
    components: {
        contextMenu,
    },
    data() {
        return {
            container: null,
            editor: null,
            components: {
                'num':           new allComponents.NumComponent(),
                'add':           new allComponents.AddComponent(),
                'vec_input':     new allComponents.VectorComponent(true),
                'vec_operation': new allComponents.VectorOperationComponent(),
                'vec_output':    new allComponents.VectorComponent(false),
            },
        };
    },

    methods: {
        deleteNode() {
            console.log('deleteNode');
            this.editor.selected.each(node => {
                this.editor.removeNode(node);
            });
        },
        async addNode(nodeType) {
            console.log(`Add node (type ${nodeType})`);

            var node = null;
            switch (nodeType) {
            case 'input':
                node = await this.components['vec_input'].createNode({'vecctl': vec3.fromValues(0, 0, 0)});
                break;
            case 'operation':
                node = await this.components['vec_operation'].createNode();
                break;
            case 'output':
                node = await this.components['vec_output'].createNode();
                break;
            default:
                throw new Error(`Cannot add node of type ${nodeType}`);
            }
            node.position = [100, 100];

            this.editor.addNode(node);
        },
    },

    mounted() {
        console.log('NodeEditor.vue mounted()');
        this.container = document.getElementById('rete');
        this.editor = new Rete.NodeEditor('name@0.1.0', this.container);

        // TODO testing this... double click zoom is annoying
        // this.editor.view.container.removeEventListener('dblclick', this.editor.view.area._zoom.dblclick);

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin);

        const engine = new Rete.Engine('name@0.1.0');

        Object.keys(this.components).map(key => {
            this.editor.register(this.components[key]);
            engine.register(this.components[key]);
        });

        this.editor.on('process nodecreated noderemoved connectioncreated connectionremoved',
            async () => {
                console.log('editor processing');
                console.log(this.editor.toJSON());
                await engine.abort(); // Stop old job if running
                console.log('calling engine.process');
                await engine.process(this.editor.toJSON());

                // TODO should I save during more events?
                window.localStorage.setItem('node_editor', JSON.stringify(this.editor.toJSON()));

                this.$emit('process', this.editor.toJSON());
                this.$root.$emit('node_engine_processed', this.editor.toJSON());
            });
        this.editor.on('nodecreated', node => {
            Array.prototype.map.call(document.getElementsByClassName('node'), nodeView => {
                nodeView.addEventListener('contextmenu', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.$refs.ctxMenu.open(event, {node: node, nodeView: nodeView});
                });
            });
        });
        engine.on('error', ({message, data}) => {
            console.warn(`Error in Rete engine: ${message}`);
            console.info(data);
        });

        (async () => {
            /* const savedEditorJson = null; */
            const savedEditorJson = JSON.parse(window.localStorage.getItem('node_editor'));

            if (savedEditorJson) {
                console.log('Loading node editor from local storage');
                console.log(savedEditorJson);
                await this.editor.fromJSON(savedEditorJson);
            } else {
                console.log('creating nodes');
                var in1 = await this.components['num'].createNode({'numctl': 5});
                var in2 = await this.components['num'].createNode({'numctl': 4});
                var out = await this.components['add'].createNode();
                var vec = await this.components['vec_input'].createNode({'vecctl': vec3.fromValues(3, 2, 1)});
                var vec2 = await this.components['vec_input'].createNode({'vecctl': vec3.fromValues(2, 2, 2)});
                var vecOp = await this.components['vec_operation'].createNode();
                var vecOut = await this.components['vec_output'].createNode();
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
                this.editor.connect(in1.outputs.get('num'), out.inputs.get('num1'));
                this.editor.connect(in2.outputs.get('num'), out.inputs.get('num2'));
                this.editor.connect(vec.outputs.get('vec'), vecOp.inputs.get('vec1'));
                this.editor.connect(vec2.outputs.get('vec'), vecOp.inputs.get('vec2'));
                this.editor.connect(vecOp.outputs.get('vec'), vecOut.inputs.get('vec'));
                console.log('done creating nodes');
                console.log(vec);
                console.log(vecOut);
                console.log(this.components['vec_input']);
                console.log(this.components['vec_output']);
            }
        })();

        /* this.editor.view.resize() */
        console.log('MAIN process');
        this.editor.trigger('process');
        console.log('MAIN end process');
    },
};
</script>

<style>
.node-editor {
    position: relative;
    display: block;
    width: 100%;
    min-height: 100px;
    overflow-y: hidden;
}
.rete {
    display: block;
    height: 100%;
    min-height: 100vh;
    border: 2px solid #dddddd;
}
.split {
    overflow-y: hidden;
}

/* Global overrides for Rete style */
#app .node {
    min-width: 100px;
    padding-bottom: 0px;
    background: #aaaaaa;
    border: 1px solid #555555;
}
#app .node.selected {
    background: #cccccc;
    border: 1px solid #555555;
}
#app .node .title {
    padding: 6px;
    background-color: #888888;
    border-radius: 10px 10px 0 0;
}
#app .node .control {
    padding: 8px;
}
#app .node input {
    border: 1px solid #555555;
    border-radius: 6px;
    padding-left: 4px;
}
#app .node .input-title {
    margin: 2px;
}
#app .node .output-title {
    margin: 2px;
}

#app .connection {
    /* Fix display bug with connections */
    /* TODO I think something with bootstrap causes the svg element to be aligned to center */
    position: absolute;
    left: 0px;
    z-index: -5;
}
#app .connection .main-path {
    stroke: black;
    stroke-width: 3px;
}

#app .socket {
    width: 16px;
    height: 16px;
}
#app .socket.input {
    margin-left: -8px;
}
#app .socket.output {
    margin-right: -8px;
}
#app .socket.number-value {
    background: #7777dd;
}
#app .socket.vector-value {
    background: #ff4444;
}

.node-editor .buttons {
    position: absolute;
    left: 5px;
    top: 5px;
}
</style>
