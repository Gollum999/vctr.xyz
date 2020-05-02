import _ from 'lodash';
import { vec3, mat4 } from 'gl-matrix';
import Rete from 'rete';

import sockets from './sockets';
import util, { s } from './operation_util';
import NodeRenderer from './NodeRenderer.vue';
import nodeUtil from './node_util';

class BaseOperation {
    static title = null;
    // TODO these should be "allowed" instead of "default"; when updating types, intersect with this, and remove connection if result is empty
    static defaultInputSockets = s.anything;
    static defaultOutputSockets = s.anything;

    static getInputName() {
        return 'X';
    }

    static getOutputName() {
        throw new Error('Not implemented');
    }

    static setupSockets(node) {
        node.addInput(new Rete.Input('input', this.getInputName(), sockets[util.socketTypeListToSocketName(this.defaultInputSockets)]));
        // TODO change socket names for consistency?
        node.addOutput(new Rete.Output('output', this.getOutputName(), sockets[util.socketTypeListToSocketName(this.defaultOutputSockets)]));
    }

    static getNewSocketTypesFromInputs(input) {
        const typesFromInputConnection = util.getInputTypes(input);
        const typesFromInputSocket = util.getSocketTypes(input.socket);

        return util.getNewSocketTypesFromInput(typesFromInputConnection, typesFromInputSocket, this.defaultInputSockets);
    }

    static updateInputSocketTypes(editor, editorNode) {
        const input = editorNode.inputs.get('input');
        const newInputTypes = this.getNewSocketTypesFromInputs(input);

        util.updateIoType(input, newInputTypes);
    }

    static updateOutputSocketTypes(editor, editorNode) {
        if (!this.inputToOutputTypeMap) {
            // console.log(`TEST updateOutputSocketTypes input to output type map is null, returning early (${editorNode.name})`);
            return;
        }

        const inputTypes = util.getSocketTypes(editorNode.inputs.get('input').socket);

        // console.log(`TEST updateOutputSocketTypes ${editorNode.name}`);
        const output = editorNode.outputs.get('output');
        util.updateIoType(output, this.getExpectedOutputTypes(inputTypes));

        // If this output changed to a type that is no longer compatible with some of its connections, remove those connections
        util.removeOutputConnectionsIfIncompatible(editor, output);
    }

    static getExpectedOutputTypes(inputTypeList) {
        // console.log(`TEST getExpectedOutputTypes "${inputTypeList}"`);
        const allExpectedTypes = new Set();
        for (const inputType of inputTypeList) {
            // console.log(`TEST getExpectedOutputTypes inputType "${inputType}"`);
            const expectedOutputTypeList = this.inputToOutputTypeMap[inputType];
            // console.log(`TEST getExpectedOutputTypes expected output type ${expectedOutputTypeList} from "${inputType}"`);
            for (const t of expectedOutputTypeList) {
                // console.log(`TEST getExpectedOutputTypes Adding output type ${t} from "${inputType}"`);
                allExpectedTypes.add(t);
            }
        }

        // console.log(allExpectedTypes);
        if (_.isEqual(allExpectedTypes, s.invalid)) {
            throw new Error('Invalid type combination', allExpectedTypes, `(from "${inputTypeList}")`);
        } else {
            allExpectedTypes.delete(util.invalid);
        }
        if (_.isEqual(allExpectedTypes, s.ignore)) {
            return s.ignore;
        } else {
            allExpectedTypes.delete(util.ignore);
        }
        // console.log(allExpectedTypes);

        return allExpectedTypes;
    }
}

class LengthOperation extends BaseOperation {
    static title = 'Length';
    static defaultInputSockets = s.vector;
    static defaultOutputSockets = s.scalar;

    static getOutputName() {
        return '|X|';
    }
    // Only vector -> scalar supported
    static inputToOutputTypeMap = {
        'scalar': s.invalid,
        'vector': s.scalar,
        'matrix': s.invalid,
    };

    static calculate(input) {
        if (input.type === 'vector') {
            return [vec3.length(input.value)];
        }
        throw new Error(`${this.title} unsupported input type`, input.type);
    }
}

class InvertOperation extends BaseOperation {
    static title = 'Invert';
    static defaultInputSockets = s.matrix;
    static defaultOutputSockets = s.matrix;

    static getOutputName() {
        return 'x⁻¹';
    }
    // Only matrix -> matrix supported
    static inputToOutputTypeMap = {
        'scalar': s.invalid,
        'vector': s.invalid,
        'matrix': s.matrix,
    };

    static calculate(input) {
        if (input.type === 'matrix') {
            let out = mat4.create();
            return mat4.invert(out, input.value);
        }
        throw new Error(`${this.title} unsupported input type`, input.type);
    }
}

// TODO Hack, clean this up; all these operations no longer need to be Rete Components for the most part
export const UnaryOperation = Object.freeze({
    'Length': LengthOperation,
    'Invert': InvertOperation,
});

export class UnaryOperationComponent extends Rete.Component {
    constructor(opName) {
        // Note that the Rete engine does some node lookups by name, so each node type must have a unique name.
        // This is especially important in here where I give the component some state; if the name is shared anywhere it will look up
        //   the wrong worker() function during engine processing
        super(UnaryOperation[opName].title);
        this.data.component = NodeRenderer;

        this.opName = opName;
    }

    builder(node) {
        UnaryOperation[this.opName].setupSockets(node);
        return node;
    }

    worker(engineNode, inputs, outputs) {
        const operation = UnaryOperation[this.opName];

        const inputValue = nodeUtil.getInputValue('input', inputs, engineNode.data);
        console.log('UnaryOperationComponent worker', operation, inputValue);
        if (_.isNil(inputValue)) {
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

        // console.log(inputValue);
        let result = operation.calculate({type: determineType(inputValue), value: inputValue});
        if (result instanceof Float32Array) {
            // Float32Array serializes as an object instead of a regular array; force types to be consistent
            // TODO how will this look for matrices?  should this be the receiving node's responsibility?
            result = Array.from(result);
        }
        console.log('UnaryOperationComponent result:', result);
        outputs['output'] = result;
    }
};