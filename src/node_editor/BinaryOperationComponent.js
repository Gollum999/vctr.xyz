import _ from 'lodash';
import Rete from 'rete';

import NodeRenderer from './NodeRenderer.vue';
import nodeUtil from './node_util';
import { CalculationError } from './WarningControl.js';
import history from '../history';
import { MultiAction, RemoveAllNodeOutputConnectionsAction } from '../history_actions.js';

export default class BinaryOperationComponent extends Rete.Component {
    constructor(operation) {
        // Note that the Rete engine does some node lookups by name, so each node type must have a unique name.
        // This is especially important in here where I give the component some state; if the name is shared anywhere it will look up
        //   the wrong worker() function during engine processing
        super(operation.title);
        this.operation = operation;
        this.data.component = NodeRenderer;
    }

    builder(node) {
        this.operation.setupSockets(this.editor, node);
        return node;
    }

    worker(engineNode, inputs, outputs) {
        const lhsValue = nodeUtil.getInputValue('lhs', inputs, engineNode.data);
        const rhsValue = nodeUtil.getInputValue('rhs', inputs, engineNode.data);
        if (_.isNil(lhsValue) || _.isNil(rhsValue)) {
            return;
        }

        // Bit of a hack; probably more correct to put something in node.data, or maybe  look at the type of the node on the other
        // side of the input connection
        function determineType(val) {
            switch (val.length) {
            case 1:  return 'scalar';
            case 3:  return 'vector';
            case 16: return 'matrix';
            default: throw new Error(`Could not determine input type from value "${val}"`);
            }
        }

        // console.log(lhsValue, rhsValue);
        const editorNode = nodeUtil.getEditorNode(this.editor, engineNode);
        let result;
        try {
            result = this.operation.calculate({type: determineType(lhsValue), value: lhsValue}, {type: determineType(rhsValue), value: rhsValue});
            editorNode.data['disabled'] = false;
            editorNode.controls.get('warning').setWarning('');
        } catch (e) {
            if (e instanceof CalculationError) {
                editorNode.data['disabled'] = true;
                editorNode.controls.get('warning').setWarning(e.message);
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
        outputs['result'] = result;
    }
};
