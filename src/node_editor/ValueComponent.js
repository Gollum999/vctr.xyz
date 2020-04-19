import _ from 'lodash';
import NodeRenderer from './NodeRenderer';
import Rete from 'rete';
import sockets from './sockets';
import { ValueControl } from './ValueControl';
import { AxesLabelControl } from './AxesLabelControl';
import { ColorControl } from './ColorControl';
import util from '../util';
import nodeUtil, { ValueType } from './node_util';

export class ValueComponent extends Rete.Component {
    constructor(globalVuetify, valueType) {
        // TODO should consider patching Rete to allow specifying extra attributes or something
        // TODO   not sure of the best design since render plugin is entirely separate from components
        super(util.capitalize(valueType)); // Note that the node name affects the element class as well as the node title
        this.globalVuetify = globalVuetify;
        this.valueType = valueType;
        this.data.component = NodeRenderer;
    }

    builder(node) {
        // console.log('ValueComponent builder: this: ', this, 'valueType:', this.valueType, 'globalVuetify:', this.globalVuetify);

        const socket = {
            [ValueType.SCALAR]: sockets.scalar,
            [ValueType.VECTOR]: sockets.vector,
            [ValueType.MATRIX]: sockets.matrix,
        }[this.valueType];

        node.addInput(new Rete.Input('value', 'Value', socket));
        node.addInput(new Rete.Input('color_label', 'Color', null));
        // If this key changes, NodeRenderer must also change // TODO remove this assumption
        node.addInput(new Rete.Input('pos', 'Position', sockets.vector));

        if (this.valueType === ValueType.VECTOR || this.valueType === ValueType.MATRIX) {
            node.addControl(new AxesLabelControl(this.valueType, this.editor, 'label', -999));
        }
        node.addControl(new ValueControl(this.valueType, this.editor, 'value', 1, this.globalVuetify));
        node.addControl(new ColorControl(this.editor, 'color', 2, this.globalVuetify));
        node.addControl(new ValueControl(ValueType.VECTOR, this.editor, 'pos', 3, this.globalVuetify));

        node.addOutput(new Rete.Output('value', 'Value', socket));

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
        // console.log('ValueComponent worker', node.name, '(', node.id, ')', node.data);

        const editorNode = nodeUtil.getEditorNode(this.editor, node);
        // console.log('VECTOR', node, editorNode, inputs, editorNode.inputs);

        if (nodeUtil.hasInput(inputs, 'value')) {
            const inputValue = nodeUtil.getInputValue('value', inputs, node.data);
            // console.log('ValueComponent worker setting "value" from input to ', inputValue, typeof inputValue);
            node.data.value = inputValue.slice(); // Make a copy to avoid sharing the same object between nodes
            editorNode.controls.get('value').setValue(inputValue);
            editorNode.controls.get('value').setReadOnly(true);
        } else {
            // console.log('ValueComponent worker, inputValue empty, setting "value" readonly = false');
            editorNode.controls.get('value').setReadOnly(false);
        }

        const posControl = editorNode.controls.get('pos');
        if (!_.isNil(posControl.vueContext)) { // Bit of a hack, could hold a reference to the global settings
            if (nodeUtil.hasInput(inputs, 'pos')) {
                const inputPos = nodeUtil.getInputValue('pos', inputs, node.data);
                node.data.pos = inputPos.slice(); // Make a copy to avoid sharing the same object between nodes
                posControl.setValue(inputPos);
                posControl.setReadOnly(true);
            } else {
                posControl.setReadOnly(false);
            }
        }

        if (!_.isNil(node.data.value)) {
            // console.log('ValueComponent worker setting output to ', node.data.value, typeof node.data.value);
            outputs['value'] = node.data.value.slice(); // Make a copy to avoid sharing the same object between nodes
        }
    }
};
