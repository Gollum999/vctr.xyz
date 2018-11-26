import Rete from 'rete';
import controls from '@/components/node_editor/controls';

const numSocket = new Rete.Socket('Number value');
const vectorSocket = new Rete.Socket('Vector value');

class NumComponent extends Rete.Component {
    constructor() {
        super('Number');
        console.log('NumComponent constructor');
    }

    builder(node) {
        console.log('NumComponent builder');
        let out = new Rete.Output('num', 'Number', numSocket);
        let control = new controls.NumControl(this.editor, 'numctl');
        node.addControl(control);
        node.addOutput(out);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log(`NumComponent worker setting output to ${node.data.numctl} (${typeof node.data.numctl})`);
        console.log(node.data);
        outputs['num'] = node.data.numctl;
    }
}

class VectorComponent extends Rete.Component {
    constructor() {
        super('Vector');
        console.log('VectorComponent constructor');
    }

    builder(node) {
        console.log('VectorComponent builder');
        let out = new Rete.Output('vec', 'Vector', vectorSocket);
        let outX = new Rete.Output('x', 'X', numSocket);
        let outY = new Rete.Output('y', 'Y', numSocket);
        let outZ = new Rete.Output('z', 'Z', numSocket);
        let control = new controls.VectorControl(this.editor, 'vecctl');
        node.addControl(control);
        node.addOutput(out);
        node.addOutput(outX);
        node.addOutput(outY);
        node.addOutput(outZ);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log(`VectorComponent worker setting output to ${node.data.vecctl} (${typeof node.data.vecctl})`);
        console.log(node.data);
        outputs['vec'] = node.data.vecctl;
        outputs['x'] = node.data.vecctl[0];
        outputs['y'] = node.data.vecctl[1];
        outputs['z'] = node.data.vecctl[2];
    }
}

class AddComponent extends Rete.Component {
    constructor() {
        super('Add');
        /* console.log('AddComponent constructor'); */
        /* console.log(this.editor); */
        /* this.node = this.editor.nodes.find(n => n.id == node.id); */
    }

    builder(node) {
        /* console.log('AddComponent builder'); */
        /* console.log(this.editor); */
        this.node = this.editor.nodes.find(n => n.id === node.id);
        let in1 = new Rete.Input('num1', 'Number 1', numSocket);
        let in2 = new Rete.Input('num2', 'Number 2', numSocket);
        let control = new controls.NumControl(this.editor, 'numctl', true);
        node.addControl(control);
        node.addInput(in1);
        node.addInput(in2);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log('AddComponent worker');
        console.log(inputs);
        console.log(`${inputs['num1']} (${typeof inputs['num1']}) (${typeof inputs['num1'][0]})`);
        console.log(`${inputs['num2']} (${typeof inputs['num2']}) (${typeof inputs['num2'][0]})`);
        // TODO when should I use node.data over inputs?  why do I have to search for this node by id?
        console.log(node.data);
        console.log(typeof node.data.numctl);
        /* console.log(node.controls); */
        /* console.log(this.editor.nodes.find(n => n.id === node.id).controls); */
        /* console.log(this.node.controls); */
        const thisNode = this.editor.nodes.find(n => n.id === node.id);
        const sum = inputs['num1'][0] + inputs['num2'][0];
        console.log(`AddComponent setting ctrl to ${sum}`);
        thisNode.controls.get('numctl').setValue(sum);
    }
}

export default { NumComponent, VectorComponent, AddComponent };
