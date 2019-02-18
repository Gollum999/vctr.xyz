import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ScalarControl } from './ScalarControl';

export class AddComponent extends Rete.Component {
    constructor() {
        super('Add - Old');
        this.data.component = NodeRenderer;
    }

    builder(node) {
        this.node = this.editor.nodes.find(n => n.id === node.id);
        let in1 = new Rete.Input('scalar1', 'Number 1', sockets.scalar);
        let in2 = new Rete.Input('scalar2', 'Number 2', sockets.scalar);
        let control = new ScalarControl(this.editor, 'value', true);
        node.addControl(control);
        node.addInput(in1);
        node.addInput(in2);
        return node;
    }

    worker(node, inputs, outputs) {
        const editorNode = this.editor.nodes.find(n => n.id === node.id);
        const sum = inputs['scalar1'][0] + inputs['scalar2'][0];
        console.log(`AddComponent setting ctrl to ${sum}`);
        editorNode.controls.get('value').setValue(sum);
    }
};
