<template>
  <div class="node-editor">
    <div class="rete" id="rete" />
  </div>
</template>

<script>
import Rete from 'rete';
import ConnectionPlugin from 'rete-connection-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import components from '@/components/node_editor/components';
// import { Engine, ComponentWorker } from 'rete/build/rete-engine.min'
import { vec3 } from 'gl-matrix';

export default {
    name: 'NodeEditor',
    data() {
        return {
            container: null,
            editor: null,
        };
    },
    mounted() {
        console.log('NodeEditor.vue mounted()');
        this.container = document.getElementById('rete');
        this.editor = new Rete.NodeEditor('name@0.1.0', this.container);

        // TODO testing this... double click zoom is annoying
        // this.editor.view.container.removeEventListener('dblclick', this.editor.view.area._zoom.dblclick);

        const componentList = [ // TODO this is gross
            new components.NumComponent(),
            new components.AddComponent(),
            new components.VectorComponent(true),
            new components.VectorOperationComponent(),
            new components.VectorComponent(false),
        ];

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin);

        const engine = new Rete.Engine('name@0.1.0');

        componentList.map(c => {
            this.editor.register(c);
            engine.register(c);
        });

        this.editor.on('process nodecreated noderemoved connectioncreated connectionremoved',
            async () => {
                console.log('editor processing');
                console.log(this.editor.toJSON());
                await engine.abort(); // Stop old job if running
                console.log('calling engine.process');
                await engine.process(this.editor.toJSON());
                this.$emit('process', this.editor.toJSON());
            });
        engine.on('error', ({message, data}) => {
            console.warn(`Error in Rete engine: ${message}`);
            console.info(data);
        });

        (async () => {
            console.log('creating nodes');
            var in1 = await componentList[0].createNode({'numctl': 5});
            var in2 = await componentList[0].createNode({'numctl': 4});
            var out = await componentList[1].createNode();
            var vec = await componentList[2].createNode({'vecctl': vec3.fromValues(3, 2, 1)});
            var vec2 = await componentList[2].createNode({'vecctl': vec3.fromValues(2, 2, 2)});
            var vecOp = await componentList[3].createNode();
            var vecOut = await componentList[4].createNode();
            in1.position = [20, 20];
            in2.position = [20, 170];
            out.position = [180, 75];
            vec.position = [320, 75];
            vec2.position = [320, 300];
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
            console.log(componentList[2]);
            console.log(componentList[4]);
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
</style>
