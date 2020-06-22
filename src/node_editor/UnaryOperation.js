import _ from 'lodash';
import { vec3, mat4 } from 'gl-matrix';
import Rete from 'rete';

import sockets from './sockets';
import util, { s } from './operation_util';
import { WarningControl, CalculationError } from './WarningControl';
import { UnaryOperationNodeType } from './node_util';

class UnaryOperation {
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

    static setupSockets(editor, node) {
        node.addInput(new Rete.Input('input', this.getInputName(), sockets[util.socketTypeListToSocketName(this.defaultInputSockets)]));
        node.addControl(new WarningControl(editor, 'warning', 1));
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

class LengthOperation extends UnaryOperation {
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

// TODO use this for unary "-" for vectors, or maybe 1/v?
class InvertOperation extends UnaryOperation {
    static title = 'Invert';
    static defaultInputSockets = s.matrix;
    static defaultOutputSockets = s.matrix;

    static getOutputName() {
        return 'X⁻¹';
    }
    // Only matrix -> matrix supported
    static inputToOutputTypeMap = {
        'scalar': s.invalid,
        'vector': s.invalid,
        'matrix': s.matrix,
    };

    static calculate(input) {
        if (input.type === 'matrix') {
            const out = mat4.create();
            const result = mat4.invert(out, input.value);
            if (result === null) {
                throw new CalculationError('Determinant is 0; matrix cannot be inverted');
            }
            return result;
        }
        throw new Error(`${this.title} unsupported input type`, input.type);
    }
}

class NormalizeOperation extends UnaryOperation {
    static title = 'Normalize';
    static defaultInputSockets = s.vector;
    static defaultOutputSockets = s.vector;

    static getOutputName() {
        return 'norm(X)';
    }
    // Only vector -> vector supported
    static inputToOutputTypeMap = {
        'scalar': s.invalid,
        'vector': s.vector,
        'matrix': s.invalid,
    };

    static calculate(input) {
        if (input.type === 'vector') {
            const out = vec3.create();
            return vec3.normalize(out, input.value);
        }
        throw new Error(`${this.title} unsupported input type`, input.type);
    }
}

class TransposeOperation extends UnaryOperation {
    static title = 'Transpose';
    static defaultInputSockets = s.matrix;
    static defaultOutputSockets = s.matrix;

    static getOutputName() {
        return 'Xᵀ';
    }
    // Only matrix -> matrix supported
    static inputToOutputTypeMap = {
        'scalar': s.invalid,
        'vector': s.invalid,
        'matrix': s.matrix,
    };

    static calculate(input) {
        if (input.type === 'matrix') {
            const out = mat4.create();
            return mat4.transpose(out, input.value);
        }
        throw new Error(`${this.title} unsupported input type`, input.type);
    }
}

class DeterminantOperation extends UnaryOperation {
    static title = 'Determinant';
    static defaultInputSockets = s.matrix;
    static defaultOutputSockets = s.scalar;

    static getOutputName() {
        return '|X|';
    }
    // Only matrix -> scalar supported
    static inputToOutputTypeMap = {
        'scalar': s.invalid,
        'vector': s.invalid,
        'matrix': s.scalar,
    };

    static calculate(input) {
        if (input.type === 'matrix') {
            return [mat4.determinant(input.value)];
        }
        throw new Error(`${this.title} unsupported input type`, input.type);
    }
}

export default {
    [UnaryOperationNodeType.LENGTH]:      LengthOperation,
    [UnaryOperationNodeType.INVERT]:      InvertOperation,
    [UnaryOperationNodeType.NORMALIZE]:   NormalizeOperation,
    [UnaryOperationNodeType.TRANSPOSE]:   TransposeOperation,
    [UnaryOperationNodeType.DETERMINANT]: DeterminantOperation,
};
