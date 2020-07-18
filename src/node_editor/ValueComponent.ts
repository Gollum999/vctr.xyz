import _ from 'lodash';
import Rete from 'rete';
import sockets from './sockets';
import { ValueControl } from './ValueControl';
import { AxesLabelControl } from './AxesLabelControl';
import { ColorControl } from './ColorControl';
import * as nodeUtil from './node_util';
import type { Node } from 'rete/types/node';
import type { Socket } from 'rete/types/socket';
import type { Inputs as DataInputs, Outputs as DataOutputs, Node as DataNode } from 'rete/types/core/data';

export class ValueComponent extends Rete.Component {
    constructor(private readonly nodeType: nodeUtil.ValueNodeType) {
        super(nodeType); // Note that the node name affects the element class as well as the node title
        this.nodeType = nodeType;
    }

    async builder(node: Node): Promise<Node> {
        // console.log('ValueComponent builder: this: ', this, 'nodeType:', this.nodeType);

        const socket = ({
            [nodeUtil.ValueNodeType.SCALAR]: sockets.scalar,
            [nodeUtil.ValueNodeType.VECTOR]: sockets.vector,
            [nodeUtil.ValueNodeType.MATRIX]: sockets.matrix,
        } as {[key: string]: Socket})[this.nodeType];

        if (this.nodeType === nodeUtil.ValueNodeType.VECTOR || this.nodeType === nodeUtil.ValueNodeType.MATRIX) {
            node.addControl(new AxesLabelControl(this.nodeType, this.editor, 'label', -999));
        }

        node.addInput(new Rete.Input('value', 'Value', socket));
        node.addControl(new ValueControl(this.nodeType, this.editor, 'value', 1));

        // rete-vue-render-plugin is the only thing that relies on socket being non-null, and I have my own NodeRenderer
        node.addInput(new Rete.Input('color_label', 'Color', (null as any)));
        node.addControl(new ColorControl(this.editor, 'color', 2));

        node.addInput(new Rete.Input(nodeUtil.ADVANCED_RENDER_CONTROLS_KEY, 'Position', sockets.vector));
        node.addControl(new ValueControl(nodeUtil.ValueNodeType.VECTOR, this.editor, nodeUtil.ADVANCED_RENDER_CONTROLS_KEY, 3));

        node.addOutput(new Rete.Output('value', 'Value', socket));

        return node;
    }

    worker(node: DataNode, inputs: DataInputs, outputs: DataOutputs): void {
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
        const valueControl = editorNode.controls.get('value') as ValueControl;
        if (_.isNil(valueControl)) {
            throw new Error('Could not find "value" control');
        }

        if (nodeUtil.hasInput(inputs, 'value')) {
            const inputValue = nodeUtil.getInputValue('value', inputs, node.data);
            // console.log('ValueComponent worker setting "value" from input to ', inputValue, typeof inputValue);

            node.data.value = inputValue.slice(); // Make a copy to avoid sharing the same object between nodes
            valueControl.setValue(inputValue);
            valueControl.setReadOnly(true);
        } else {
            // console.log('ValueComponent worker, inputValue empty, setting "value" readonly = false');
            valueControl.setReadOnly(false);
        }

        const posControl = editorNode.controls.get(nodeUtil.ADVANCED_RENDER_CONTROLS_KEY) as ValueControl;
        if (_.isNil(posControl)) {
            throw new Error('Could not find "pos" control');
        }
        if (!_.isNil(posControl.vueContext)) { // Bit of a hack, could hold a reference to the global settings
            if (nodeUtil.hasInput(inputs, nodeUtil.ADVANCED_RENDER_CONTROLS_KEY)) {
                const inputPos = nodeUtil.getInputValue(nodeUtil.ADVANCED_RENDER_CONTROLS_KEY, inputs, node.data);
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
