import _ from 'lodash';
import Rete from 'rete';

import * as nodeUtil from './node_util';
import { CalculationError, WarningControl } from './WarningControl';
import history from '../history';
import { MultiAction, RemoveAllNodeOutputConnectionsAction } from '../history_actions';
import { BinaryOperation, allBinaryOperations } from './BinaryOperation';
import type { Node } from 'rete/types/node';
import type { Inputs as DataInputs, Outputs as DataOutputs, Node as DataNode } from 'rete/types/core/data';

export default class BinaryOperationComponent extends Rete.Component {
    private readonly operation: typeof BinaryOperation;

    constructor(nodeType: nodeUtil.BinaryOperationNodeType) {
        super(nodeType);
        this.operation = allBinaryOperations[nodeType];
    }

    async builder(node: Node): Promise<Node> {
        this.operation.setupSockets(this.editor, node);
        return node;
    }

    worker(engineNode: DataNode, inputs: DataInputs, outputs: DataOutputs): void {
        const editorNode = nodeUtil.getEditorNode(this.editor, engineNode);
        const warningControl = editorNode.controls.get('warning') as WarningControl;
        editorNode.data['disabled'] = false;
        if (warningControl == null) {
            throw new Error('WarningControl was null');
        }
        warningControl.setWarning('');

        const lhsValue = nodeUtil.getInputValue('lhs', inputs, engineNode.data);
        const rhsValue = nodeUtil.getInputValue('rhs', inputs, engineNode.data);
        if (_.isNil(lhsValue) || _.isNil(rhsValue)) {
            return;
        }

        // Bit of a hack; probably more correct to put something in node.data, or maybe  look at the type of the node on the other
        // side of the input connection
        function determineType(val: Array<number>): string {
            switch (val.length) {
            case 1:  return 'scalar';
            case 3:  return 'vector';
            case 16: return 'matrix';
            default: throw new Error(`Could not determine input type from value "${val}"`);
            }
        }

        // console.log(lhsValue, rhsValue);
        let result;
        try {
            result = this.operation.calculate(
                {type: determineType(lhsValue), value: lhsValue},
                {type: determineType(rhsValue), value: rhsValue},
            );
        } catch (e) {
            if (e instanceof CalculationError) {
                editorNode.data['disabled'] = true;
                warningControl.setWarning(e.message);
                this.editor.trigger('error', {message: e.message, data: editorNode});
                if (Array.from(editorNode.outputs.values()).some(io => io.connections.length)) {
                    const action = new RemoveAllNodeOutputConnectionsAction(this.editor, editorNode);
                    history.addAndDo(action);
                    history.squashTopActions(2); // Squash the value change that caused this
                }
            } else {
                throw e;
            }
        }
        if (result instanceof Float32Array) {
            // Float32Array serializes as an object instead of a regular array; force types to be consistent
            result = Array.from(result);
        }
        outputs['result'] = result;
    }
};
