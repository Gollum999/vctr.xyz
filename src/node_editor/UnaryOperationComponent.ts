import _ from 'lodash';
import Rete from 'rete';

import * as nodeUtil from './node_util';
import { CalculationError, WarningControl } from './WarningControl';
import history from '../history';
import { MultiAction, RemoveAllNodeOutputConnectionsAction } from '../history_actions';
import type { UnaryOperation } from './UnaryOperation';
import type { Node } from 'rete/types/node';
import type { Inputs as DataInputs, Outputs as DataOutputs, Node as DataNode } from 'rete/types/core/data';

export default class UnaryOperationComponent extends Rete.Component {
    private readonly operation: typeof UnaryOperation;

    constructor(operation: typeof UnaryOperation) {
        // Note that the Rete engine does some node lookups by name, so each node type must have a unique name.
        // This is especially important in here where I give the component some state; if the name is shared anywhere it will look up
        //   the wrong worker() function during engine processing
        if (operation.title == null) {
            throw new Error(`Operation title was null: ${operation}`);
        }
        super(operation.title);
        this.operation = operation;
    }

    async builder(node: Node): Promise<Node> {
        this.operation.setupSockets(this.editor, node);
        return node;
    }

    worker(engineNode: DataNode, inputs: DataInputs, outputs: DataOutputs): void {
        const editorNode = nodeUtil.getEditorNode(this.editor, engineNode);
        const warningControl = editorNode.controls.get('warning') as WarningControl;
        editorNode.data['disabled'] = false;
        warningControl.setWarning('');

        const inputValue = nodeUtil.getInputValue('input', inputs, engineNode.data);
        // console.log('UnaryOperationComponent worker', this.operation, inputValue);
        if (_.isNil(inputValue)) {
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

        // console.log(inputValue);
        let result;
        try {
            result = this.operation.calculate({type: determineType(inputValue), value: inputValue});
        } catch (e) {
            if (e instanceof CalculationError) {
                editorNode.data['disabled'] = true;
                warningControl.setWarning(e.message);
                if (Array.from(editorNode.outputs.values()).some(io => io.connections.length)) {
                    const action = new RemoveAllNodeOutputConnectionsAction(this.editor, editorNode);
                    history.addAndDo(action);
                    history.add(new MultiAction(history.squashTopActions(2))); // Squash the value change that caused this
                }
            } else {
                throw e;
            }
        }
        if (result instanceof Float32Array) {
            // Float32Array serializes as an object instead of a regular array; force types to be consistent
            // TODO how will this look for matrices?  should this be the receiving node's responsibility?
            result = Array.from(result);
        }
        // console.log('UnaryOperationComponent result:', result);
        outputs['output'] = result;
    }
};
