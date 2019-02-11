import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ScalarControl } from './ScalarControl';

export class AddComponent extends Rete.Component {
    constructor() {
        super('Add');
        this.data.component = NodeRenderer;
        /* console.log('AddComponent constructor'); */
        /* console.log(this.editor); */
        /* this.node = this.editor.nodes.find(n => n.id == node.id); */
    }

    builder(node) {
        /* console.log('AddComponent builder'); */
        /* console.log(this.editor); */
        this.node = this.editor.nodes.find(n => n.id === node.id);
        let in1 = new Rete.Input('num1', 'Number 1', sockets.scalar);
        let in2 = new Rete.Input('num2', 'Number 2', sockets.scalar);
        let control = new ScalarControl(this.editor, 'numctl', true);
        node.addControl(control);
        node.addInput(in1);
        node.addInput(in2);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log('AddComponent worker');
        // console.log(node);
        // console.log(inputs);
        // console.log(outputs);
        // console.log(`${inputs['num1']} (${typeof inputs['num1']}) (${typeof inputs['num1'][0]})`);
        // console.log(`${inputs['num2']} (${typeof inputs['num2']}) (${typeof inputs['num2'][0]})`);
        // TODO when should I use node.data over inputs?
        //   inputs is empty if no connections
        //   node.data is just a sane default?
        // TODO why do I have to search for this node by id?
        //   I think this is because the 'node' I am passed is just the underlying data; it doesn't know anything about the view layer (and therefore the attached controls)
        // console.log(node.data);
        // console.log(typeof node.data.numctl);
        /* console.log(node.controls); */
        /* console.log(this.editor.nodes.find(n => n.id === node.id).controls); */
        /* console.log(this.node.controls); */
        const editorNode = this.editor.nodes.find(n => n.id === node.id);
        const sum = inputs['num1'][0] + inputs['num2'][0];
        console.log(`AddComponent setting ctrl to ${sum}`);
        editorNode.controls.get('numctl').setValue(sum);
    }
};
