<template>
  <div>
    <div id="rete" class="node-editor" />
    <div>
      {{ editorJson }}
    </div>
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
            editorJson: '',
        };
    },
    mounted() {
        console.log('NodeEditor.vue mounted()');
        this.container = document.getElementById('rete');
        /* console.log(this.container); */
        this.editor = new Rete.NodeEditor('name@0.1.0', this.container);

        const componentList = [ // TODO this is gross
            new components.NumComponent(),
            new components.AddComponent(),
            new components.VectorComponent(),
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
                await engine.process(this.editor.toJSON());
                this.editorJson = this.editor.toJSON();
            });

        (async () => {
            console.log('creating nodes');
            var in1 = await componentList[0].createNode({'numctl': 5});
            var in2 = await componentList[0].createNode({'numctl': 4});
            var out = await componentList[1].createNode();
            var vec = await componentList[2].createNode({'vecctl': vec3.fromValues(3, 2, 1)});
            in1.position = [20, 20];
            in2.position = [20, 170];
            out.position = [280, 75];
            vec.position = [420, 75];

            this.editor.addNode(in1);
            this.editor.addNode(in2);
            this.editor.addNode(out);
            this.editor.addNode(vec);
            this.editor.connect(in1.outputs.get('num'), out.inputs.get('num1'));
            this.editor.connect(in2.outputs.get('num'), out.inputs.get('num2'));
        })();

        /* this.editor.view.resize() */
        this.editor.trigger('process');
    },
};
</script>

<style>
.node-editor {
    width: 100%;
    height: 400px; /* TODO use bootstrap grids */
    border: 1px solid black;
}
</style>
