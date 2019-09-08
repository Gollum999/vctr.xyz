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
        // console.log('VectorComponent worker', node.name, node.data);

        const editorNode = util.getEditorNode(this.editor, node);

        const input = util.getInputValue('vector', inputs, node.data);
        if (_.isNil(input)) {
            // console.log('VectorComponent worker, input empty, setting readonly = false');
            editorNode.controls.get('value').setReadOnly(false);
        } else {
            // console.log('VectorComponent worker setting value from input to ', input, typeof input);
            node.data.value = input.slice(); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('value').setValue(input);
            editorNode.controls.get('value').setReadOnly(true);
        }

        if (!_.isNil(node.data.value)) {
            // console.log('VectorComponent worker setting output to ', node.data.value, typeof node.data.value);
            outputs['vector'] = node.data.value.slice(); // Make a copy to avoid sharing the same object between nodes
        }
    }
};
