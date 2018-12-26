import Rete from 'rete';
import controls from '@/components/node_editor/controls';
import { vec3 } from 'gl-matrix';
import _ from 'lodash';

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
    constructor(isInput) {
        /* super('Vector'); // TODO The node name affects the element class as well as the node title */
        // TODO should consider patching Rete to allow specifying extra attributes or something
        // TODO   not sure of the best design since render plugin is entirely separate from components
        super(`Vector ${isInput ? 'Input' : 'Output'}`); // TODO The node name affects the element class as well as the node title
        console.log(`VectorComponent constructor, input: ${isInput}`);
        this.isInput = isInput;
    }

    builder(node) {
        console.log(`VectorComponent builder, input = ${this.isInput}`);
        if (this.isInput) { // TODO I think using members like this is wrong... rete is doing something weird under the covers that breaks in 'worker'
            node.addOutput(new Rete.Output('vec', 'Vector', vectorSocket));
            /* node.addOutput(new Rete.Output('x', 'X', numSocket)); */
            /* node.addOutput(new Rete.Output('y', 'Y', numSocket)); */
            /* node.addOutput(new Rete.Output('z', 'Z', numSocket)); */
            node.addControl(new controls.VectorControl(this.editor, 'vecctl', false));
        } else {
            node.addInput(new Rete.Input('vec', 'Vector', vectorSocket));
            /* node.addInput(new Rete.Input('x', 'X', numSocket));
             * node.addInput(new Rete.Input('y', 'Y', numSocket));
             * node.addInput(new Rete.Input('z', 'Z', numSocket)); */
            node.addControl(new controls.VectorControl(this.editor, 'vecctl', true));
        }
        return node;
    }

    worker(node, inputs, outputs) {
        // NOTE TO SELF: 'node', 'inputs', and 'outputs' here are all in data-land, and are not directly tied to the nodes, inputs, and outputs in the editor
        //               'node' is the JSON descriptor for the currently processed node, suitable for serialization
        //               'input' and 'output' describe the current node graph processing state
        // To check things like input state and component configuration, I either need to go through node.data or need to manually find the node through the editor by ID
        console.log(`VectorComponent worker: node id: ${node.id} isInput: ${this.isInput} inputs: ${_.isEmpty(inputs)} outputs: ${_.isEmpty(outputs)} node.inputs: ${_.isEmpty(node.inputs)} node.outputs: ${_.isEmpty(node.outputs)}`);
        // console.log(this);
        // console.log(typeof this);
        // console.log(inputs);
        // console.log(outputs);
        // TODO pull this out somewhere
        function getInput(name) { // TODO assumes only one input per socket
            // console.log(`VectorComponent getInput ${name}`);
            // console.log(inputs);
            // console.log(node.inputs);
            // console.log(node.data);
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const thisNode = this.editor.nodes.find(n => n.id === node.id);
        // console.log(node);
        // console.log(thisNode);
        // console.log(thisNode.inputs);
        // console.log(thisNode.outputs);

        if (!_.isEmpty(node.outputs)) {
            console.log(`VectorComponent worker setting output to ${node.data.vecctl} (${typeof node.data.vecctl})`);
            console.log(node.data);
            outputs['vec'] = node.data.vecctl;
            /* outputs['x'] = node.data.vecctl[0]; */
            /* outputs['y'] = node.data.vecctl[1]; */
            /* outputs['z'] = node.data.vecctl[2]; */
        } else {
            if (_.isEmpty(node.inputs)) {
                throw new Error('VectorComponent worker: both outputs and inputs were empty!');
            }
            const input = getInput('vec');
            console.log(`VectorComponent worker reading input: ${input}`);
            node.data.vecctl = input;
            thisNode.controls.get('vecctl').setValue(input);
        }
        console.log('end VectorComponent worker');
        // debugger;
    }
}

class VectorOperationComponent extends Rete.Component {
    constructor() {
        super('Vector Operation');
        console.log('VectorOperationComponent constructor');
    }

    builder(node) {
        console.log('VectorOperationComponent builder');
        let in1 = new Rete.Input('vec1', 'Vector 1', vectorSocket);
        let in2 = new Rete.Input('vec2', 'Vector 2', vectorSocket);
        let out = new Rete.Output('vec', 'Vector', vectorSocket);
        let control = new controls.VectorOperationControl(this.editor, 'vecctl');
        node.addInput(in1);
        node.addInput(in2);
        node.addOutput(out);
        node.addControl(control);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log('VectorOperationComponent worker');
        // console.log(inputs);
        // console.log(outputs);
        // console.log(node.inputs);
        // console.log(node.outputs);
        const thisNode = this.editor.nodes.find(n => n.id === node.id);
        const opFn = (() => {
            console.log('VectorOperationComponent worker');
            // console.log(thisNode);
            // console.log(thisNode.controls);
            // console.log(thisNode.controls.get('vecctl').getValue);
            // console.log(thisNode.controls.get('vecctl').getValue());
            switch (thisNode.controls.get('vecctl').getValue()) {
            case 'Add':
                return vec3.add;
            case 'Subtract':
                return vec3.subtract;
            case 'Dot':
                return vec3.dot; // TODO output sockets change
            case 'Cross':
                return vec3.cross;
            default:
                throw new Error(`Invalid operation selected in VectorOperationControl node (id ${node.id})`);
            }
        })();
        console.log(`VectorOperationControl using op: ${opFn}`);

        function getInput(name) { // TODO assumes only one input per socket
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const vec1 = getInput('vec1');
        const vec2 = getInput('vec2');
        const out = vec3.create();
        opFn(out, vec1, vec2); // TODO assign?
        console.log(out);

        outputs['vec'] = out;
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
        // console.log(inputs);
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
        const thisNode = this.editor.nodes.find(n => n.id === node.id);
        const sum = inputs['num1'][0] + inputs['num2'][0];
        console.log(`AddComponent setting ctrl to ${sum}`);
        thisNode.controls.get('numctl').setValue(sum);
    }
}

export default { NumComponent, VectorComponent, VectorOperationComponent, AddComponent };
