<template>
  <div id="rete" class="node-editor">
  </div>
</template>

<script>
import Rete from 'rete';
import ConnectionPlugin from 'rete-connection-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import components from '@/components/node_editor/components';
// import { Engine, ComponentWorker } from 'rete/build/rete-engine.min'

export default {
    name: 'NodeEditor',
    mounted() {
        console.log('NodeEditor.vue mounted()');
        const container = document.getElementById('rete');
        const componentList = [
            new components.NumComponent(),
            new components.AddComponent(),
        ];

        const editor = new Rete.NodeEditor('name@0.1.0', container);
        editor.use(ConnectionPlugin);
        editor.use(VueRenderPlugin);

        const engine = new Rete.Engine('name@0.1.0');

        componentList.map(c => {
            editor.register(c);
            engine.register(c);
        });

        console.log('before on');
        editor.on('process nodecreated noderemoved connectioncreated connectionremoved',
            async () => {
                console.log('editor processing');
                console.log(editor.toJSON());
                await engine.abort(); // Stop old job if running
                await engine.process(editor.toJSON());
            });

        console.log('before async');
        (async () => {
            console.log('creating nodes');
            var in1 = await componentList[0].createNode({'numctl': 5});
            var in2 = await componentList[0].createNode({'numctl': 4});
            var out = await componentList[1].createNode();
            in1.position = [20, 20];
            in2.position = [20, 170];
            out.position = [280, 75];

            editor.addNode(in1);
            editor.addNode(in2);
            editor.addNode(out);
            editor.connect(in1.outputs.get('num'), out.inputs.get('num1'));
            editor.connect(in2.outputs.get('num'), out.inputs.get('num2'));
        })();
        console.log('after async');

        /* editor.view.resize() */
        editor.trigger('process');
    },
};
</script>

<style>
.node-editor {
    width: 100%;
    height: 400px; /* TODO use bootstrap grids */
    border: 1px solid black;
}

.socket.number {
    background: #96b38a;
}
</style>
