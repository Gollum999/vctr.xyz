import _ from 'lodash';
import NodeRenderer from './NodeRenderer';
import Rete from 'rete';
import sockets from './sockets';
import { VectorControl } from './VectorControl';
import { VectorLabelControl } from './VectorLabelControl';
import { ColorControl } from './ColorControl';
import settings from '../settings';
import util from './node_util';

export class VectorComponent extends Rete.Component {
    constructor(globalVuetify) {
        // TODO should consider patching Rete to allow specifying extra attributes or something
        // TODO   not sure of the best design since render plugin is entirely separate from components
        super('Vector'); // Note that the node name affects the element class as well as the node title
        this.globalVuetify = globalVuetify;
        this.data.component = NodeRenderer;
    }

    builder(node) {
        // console.log('VectorComponent builder: this: ', this, 'globalVuetify:', this.globalVuetify);
        const nodeSettings = settings.loadSettings('nodeEditorSettings');

        node.addInput(new Rete.Input('vector', 'Value', sockets.vector));
        node.addInput(new Rete.Input('color_label', 'Color', null));

        node.addControl(new VectorLabelControl(this.editor, 'label', -999));
        node.addControl(new VectorControl(this.editor, 'value', 1, this.globalVuetify));
        node.addControl(new ColorControl(this.editor, 'color', 2, this.globalVuetify));
        if (nodeSettings.showAdvancedRenderSettings) {
            this.addAdvancedRenderControls(node);
        }

        node.addOutput(new Rete.Output('vector', 'Value', sockets.vector));

        return node;
    }

    addAdvancedRenderControls(node) {
        node.addInput(new Rete.Input('pos', 'Position', sockets.vector));
        node.addControl(new VectorControl(this.editor, 'pos', 3, this.globalVuetify));
    }

    removeAdvancedRenderControls(node) {
        node.data.pos = [0, 0, 0];

        const input = node.inputs.get('pos');
        if (input != null) {
            input.connections.map(this.editor.removeConnection.bind(this.editor)); // node.removeInput removes the data connections, but not the view connections
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
        // console.log('VectorComponent worker', node.name, '(', node.id, ')', node.data);
        // console.log('VECTOR', node, editorNode, inputs, editorNode.inputs);

        const editorNode = util.getEditorNode(this.editor, node);

        if (util.hasInput(inputs, 'vector')) {
            const inputValue = util.getInputValue('vector', inputs, node.data);
            // console.log('VectorComponent worker setting "value" from input to ', inputValue, typeof inputValue);
            node.data.value = inputValue.slice(); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('value').setValue(inputValue);
            editorNode.controls.get('value').setReadOnly(true);
        } else {
            // console.log('VectorComponent worker, inputValue empty, setting "value" readonly = false');
            editorNode.controls.get('value').setReadOnly(false);
        }

        if (util.hasInput(inputs, 'pos')) {
            const inputPos = util.getInputValue('pos', inputs, node.data);
            node.data.pos = inputPos.slice(); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('pos').setValue(inputPos);
            editorNode.controls.get('pos').setReadOnly(true);
        } else {
            editorNode.controls.get('pos').setReadOnly(false);
        }

        if (!_.isNil(node.data.value)) {
            // console.log('VectorComponent worker setting output to ', node.data.value, typeof node.data.value);
            outputs['vector'] = node.data.value.slice(); // Make a copy to avoid sharing the same object between nodes
        }
    }
};
