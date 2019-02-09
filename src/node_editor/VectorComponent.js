import _ from 'lodash';
import NodeRenderer from './NodeRenderer';
import Rete from 'rete';
import sockets from './sockets';
import { VectorControl } from './VectorControl';
import { VectorLabelControl } from './VectorLabelControl';
import { ColorControl } from './ColorControl';
import { vec3 } from 'gl-matrix';

export class VectorComponent extends Rete.Component {
    constructor() {
        // TODO should consider patching Rete to allow specifying extra attributes or something
        // TODO   not sure of the best design since render plugin is entirely separate from components
        super('Vector'); // Note that the node name affects the element class as well as the node title
        this.data.component = NodeRenderer;
        console.log('VectorComponent constructor');
    }

    builder(node) {
        console.log('VectorComponent builder');

        node.addInput(new Rete.Input('vec', 'Value', sockets.vector));

        node.addControl(new VectorLabelControl(this.editor, 'label', -999));
        node.addControl(new VectorControl(this.editor, 'vecctl', 1));
        node.addControl(new ColorControl(this.editor, 'color', 2));

        node.addOutput(new Rete.Output('vec', 'Value', sockets.vector));

        return node;
    }

    worker(node, inputs, outputs) {
        // NOTE TO SELF:
        //   'node', 'inputs', and 'outputs' here are all in data-land, and are not directly tied to the nodes, inputs, and outputs in the editor
        //   'node' is the JSON descriptor for the currently processed node, suitable for serialization
        //   'input' and 'output' describe the current node graph processing state
        //   To check things like input state and component configuration, I either need to go through node.data or need to manually find the node
        //     through the editor by ID
        //   Also note that anything in data will be saved between sessions
        console.log(`VectorComponent worker: node id: ${node.id} inputs: ${_.isEmpty(inputs)} outputs: ${_.isEmpty(outputs)} node.inputs: ${_.isEmpty(node.inputs)} node.outputs: ${_.isEmpty(node.outputs)}`);
        // console.log(this);
        // console.log(typeof this);
        // console.log(inputs);
        // console.log(outputs);
        // TODO pull this out somewhere
        function getInput(name) {
            // console.log(`VectorComponent getInput ${name}`);
            // console.log(inputs);
            // console.log(node.inputs);
            // console.log(node.data);
            // Assumes only a single connection per input, which is currently enforced by the editor
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const editorNode = this.editor.nodes.find(n => n.id === node.id);
        // console.log(node);
        // console.log(editorNode);
        // console.log(editorNode.inputs);
        // console.log(editorNode.outputs);

        const input = getInput('vec');
        console.log(`VectorComponent worker reading input: ${input}`);
        if (_.isNil(input)) {
            editorNode.controls.get('vecctl').setReadOnly(false);
        } else {
            node.data.vecctl = vec3.clone(input); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('vecctl').setValue(input);
            editorNode.controls.get('vecctl').setReadOnly(true);
        }

        if (_.isNil(node.data.vecctl)) {
            console.log(`VectorComponent worker not setting output (${node.data.vecctl} (${typeof node.data.vecctl}))`);
        } else {
            console.log(`VectorComponent worker setting output to ${node.data.vecctl} (${typeof node.data.vecctl})`);
            outputs['vec'] = vec3.clone(node.data.vecctl); // Make a copy to avoid sharing the same object between nodes
        }

        console.log('end VectorComponent worker');
        // debugger;
    }
};
