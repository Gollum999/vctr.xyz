import _ from 'lodash';
import NodeRenderer from './NodeRenderer';
import Rete from 'rete';
import sockets from './sockets';
import { MatrixControl } from './MatrixControl';
import { MatrixLabelControl } from './MatrixLabelControl';
import { ColorControl } from './ColorControl';
import { VectorControl } from './VectorControl.js';
import settings from '../settings';

export class MatrixComponent extends Rete.Component {
    constructor(globalVuetify) {
        // TODO should consider patching Rete to allow specifying extra attributes or something
        // TODO   not sure of the best design since render plugin is entirely separate from components
        super('Matrix'); // Note that the node name affects the element class as well as the node title
        this.globalVuetify = globalVuetify;
        this.data.component = NodeRenderer;
    }

    builder(node) {
        const nodeSettings = settings.loadSettings('nodeEditorSettings');

        node.addInput(new Rete.Input('matrix', 'Value', sockets.matrix));
        node.addInput(new Rete.Input('color_label', 'Color', null));

        node.addControl(new MatrixLabelControl(this.editor, 'label', -999));
        node.addControl(new MatrixControl(this.editor, 'value', 1, this.globalVuetify));
        node.addControl(new ColorControl(this.editor, 'color', 2, this.globalVuetify));
        if (nodeSettings.showAdvancedRenderSettings) {
            this.addAdvancedRenderControls(node);
        }

        node.addOutput(new Rete.Output('matrix', 'Value', sockets.matrix));

        return node;
    }

    addAdvancedRenderControls(node) {
        node.addInput(new Rete.Input('pos', 'Position', sockets.vector));
        node.addControl(new VectorControl(this.editor, 'pos', 3, this.globalVuetify));
    }

    removeAdvancedRenderControls(node) {
        const input = node.inputs.get('pos');
        if (input != null) {
            node.removeInput(input);
        }

        const control = node.controls.get('pos');
        if (control != null) {
            node.removeControl(control);
        }
    }

    worker(node, inputs, outputs) {
        // NOTE TO SELF:
        //   'node', 'inputs', and 'outputs' here are all in data-land, and are not directly tied to the nodes, inputs, and outputs in the editor
        //   'node' is the JSON descriptor for the currently processed node, suitable for serialization
        //   'input' and 'output' describe the current node graph processing state
        //   To check things like input state and component configuration, I either need to go through node.data or need to manually find the node
        //     through the editor by ID
        //   Also note that anything in data will be saved between sessions
        // console.log(`MatrixComponent worker "${node.name}"`);
        // console.log(node.data);

        // TODO pull this out somewhere
        function getInput(name) {
            // Assumes only a single connection per input, which is currently enforced by the editor
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const editorNode = this.editor.nodes.find(n => n.id === node.id);

        const input = getInput('matrix');
        if (_.isNil(input)) {
            editorNode.controls.get('value').setReadOnly(false);
        } else {
            node.data.value = input.slice(); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('value').setValue(input);
            editorNode.controls.get('value').setReadOnly(true);
        }

        if (!_.isNil(node.data.value)) {
            outputs['matrix'] = node.data.value.slice(); // Make a copy to avoid sharing the same object between nodes
        }
    }
};
