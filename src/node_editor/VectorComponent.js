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
    }

    builder(node) {
        node.addInput(new Rete.Input('vector', 'Value', sockets.vector));

        node.addControl(new VectorLabelControl(this.editor, 'label', -999));
        node.addControl(new VectorControl(this.editor, 'value', 1));
        node.addControl(new ColorControl(this.editor, 'color', 2));

        node.addOutput(new Rete.Output('vector', 'Value', sockets.vector));

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
        console.log(`VectorComponent worker "${node.name}"`);
        console.log(node.data);

        // TODO pull this out somewhere
        function getInput(name) {
            // Assumes only a single connection per input, which is currently enforced by the editor
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const editorNode = this.editor.nodes.find(n => n.id === node.id);

        const input = getInput('vector');
        if (_.isNil(input)) {
            editorNode.controls.get('value').setReadOnly(false);
        } else {
            node.data.value = vec3.clone(input); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('value').setValue(input);
            editorNode.controls.get('value').setReadOnly(true);
        }

        if (!_.isNil(node.data.value)) {
            outputs['vector'] = vec3.clone(node.data.value); // Make a copy to avoid sharing the same object between nodes
        }
    }
};
