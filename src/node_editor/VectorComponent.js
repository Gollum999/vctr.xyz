import _ from 'lodash';
import NodeRenderer from './NodeRenderer';
import Rete from 'rete';
import sockets from './sockets';
import { VectorControl } from './VectorControl';

class VectorComponent extends Rete.Component {
    constructor(isInput) {
        /* super('Vector'); // TODO The node name affects the element class as well as the node title */
        // TODO should consider patching Rete to allow specifying extra attributes or something
        // TODO   not sure of the best design since render plugin is entirely separate from components
        super(`Vector ${isInput ? 'Input' : 'Output'}`); // TODO The node name affects the element class as well as the node title
        this.data.component = NodeRenderer;
        console.log(`VectorComponent constructor, input: ${isInput}`);
        this.isInput = isInput;
    }

    builder(node) {
        console.log(`VectorComponent builder, input = ${this.isInput}`);
        if (this.isInput) { // TODO I think using members like this is wrong... rete is doing something weird under the covers that breaks in 'worker'
            node.addOutput(new Rete.Output('vec', 'Value', sockets.vector));
            /* node.addOutput(new Rete.Output('x', 'X', sockets.scalar)); */
            /* node.addOutput(new Rete.Output('y', 'Y', sockets.scalar)); */
            /* node.addOutput(new Rete.Output('z', 'Z', sockets.scalar)); */
            node.addControl(new VectorControl(this.editor, 'vecctl', false));
        } else {
            node.addInput(new Rete.Input('vec', 'Value', sockets.vector));
            /* node.addInput(new Rete.Input('x', 'X', sockets.scalar));
             * node.addInput(new Rete.Input('y', 'Y', sockets.scalar));
             * node.addInput(new Rete.Input('z', 'Z', sockets.scalar)); */
            node.addControl(new VectorControl(this.editor, 'vecctl', true));
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
};

export const VectorInputComponent = VectorComponent.bind(null, true);
export const VectorOutputComponent = VectorComponent.bind(null, false);
