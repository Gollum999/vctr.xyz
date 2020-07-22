import _ from 'lodash';
import { vec3, mat4 } from 'gl-matrix';
import Rete from 'rete';

import { SocketType, sockets, compoundSocket as s } from './sockets';
import util, { UnaryInputToOutputSocketMap } from './operation_util';
import { WarningControl, CalculationError } from './WarningControl';
import { UnaryOperationNodeType } from './node_util';
import type { NodeEditor } from 'rete/types/editor';
import type { Input } from 'rete/types/input';
import type { Node } from 'rete/types/node';

type CalculationInput = { value: any, type: string };

export class UnaryOperation {
    // TODO these should be "allowed" instead of "default"; when updating types, intersect with this, and remove connection if result is empty
    static defaultInputSockets = s.ANYTHING;
    static defaultOutputSockets = s.ANYTHING;
    static inputToOutputTypeMap: UnaryInputToOutputSocketMap | null = null;

    static getInputName(): string {
        return 'X';
    }

    static getOutputName(): string {
        throw new Error('Not implemented');
    }

    static calculate(input: CalculationInput): any {
        throw new Error('calculate not implemented');
    }

    static setupSockets(editor: NodeEditor, node: Node) {
        node.addInput(new Rete.Input('input', this.getInputName(), sockets[util.socketTypesToCompoundSocket(this.defaultInputSockets)]));
        node.addControl(new WarningControl(editor, 'warning', 1));
        // TODO change socket names for consistency?  define them as constants somewhere?
        node.addOutput(new Rete.Output('output', this.getOutputName(), sockets[util.socketTypesToCompoundSocket(this.defaultOutputSockets)]));
    }

    static getNewSocketTypesFromInputs(input: Input): Set<SocketType> {
        const typesFromInputConnection = util.getInputTypes(input);
        const typesFromInputSocket = util.getSocketTypes(input.socket);

        return util.getNewSocketTypesFromInput(typesFromInputConnection, typesFromInputSocket, this.defaultInputSockets);
    }

    static updateInputSocketTypes(editor: NodeEditor, editorNode: Node) {
        const input = editorNode.inputs.get('input');
        if (input == null) {
            throw new Error(`Input was null: ${input}`);
        }
        const newInputTypes = this.getNewSocketTypesFromInputs(input);

        util.updateIoType(input, newInputTypes);
    }

    static updateOutputSocketTypes(editor: NodeEditor, editorNode: Node) {
        if (!this.inputToOutputTypeMap) {
            return;
        }

        const input = editorNode.inputs.get('input');
        if (input == null) {
            throw new Error(`Input "input" not found`);
        }
        const inputTypes = util.getSocketTypes(input.socket);

        const output = editorNode.outputs.get('output');
        if (output == null) {
            throw new Error('Output "output" not found');
        }
        util.updateIoType(output, this.getExpectedOutputTypes(inputTypes));

        // If this output changed to a type that is no longer compatible with some of its connections, remove those connections
        util.removeOutputConnectionsIfIncompatible(editor, output);
    }

    static getExpectedOutputTypes(inputTypeList: Set<SocketType>): Set<SocketType> {
        if (this.inputToOutputTypeMap == null) {
            throw new Error('inputToOutputTypeMap was not defined');
        }
        const allExpectedTypes = new Set<SocketType>();
        for (const inputType of inputTypeList) {
            const expectedOutputTypeList = this.inputToOutputTypeMap[inputType];
            for (const t of expectedOutputTypeList) {
                allExpectedTypes.add(t);
            }
        }

        if (_.isEqual(allExpectedTypes, s.INVALID)) {
            throw new Error(`Invalid type combination ${allExpectedTypes} (from "${inputTypeList}")`);
        } else {
            allExpectedTypes.delete(SocketType.INVALID);
        }
        if (_.isEqual(allExpectedTypes, s.IGNORE)) {
            return s.IGNORE;
        } else {
            allExpectedTypes.delete(SocketType.IGNORE);
        }

        return allExpectedTypes;
    }
}

export class LengthOperation extends UnaryOperation {
    static defaultInputSockets = s.VECTOR;
    static defaultOutputSockets = s.SCALAR;

    static getOutputName(): string {
        return '|X|';
    }
    // Only vector -> scalar supported
    static inputToOutputTypeMap = {
        'scalar': s.INVALID,
        'vector': s.SCALAR,
        'matrix': s.INVALID,
    };

    static calculate(input: CalculationInput): any {
        if (input.type === 'vector') {
            return [vec3.length(input.value)];
        }
        throw new Error(`${this.constructor.name} unsupported input type ${input.type}`);
    }
}

export class InvertOperation extends UnaryOperation {
    static defaultInputSockets = s.MATRIX;
    static defaultOutputSockets = s.MATRIX;

    static getOutputName(): string {
        return 'X⁻¹';
    }
    // Only matrix -> matrix supported
    static inputToOutputTypeMap = {
        'scalar': s.INVALID,
        'vector': s.INVALID,
        'matrix': s.MATRIX,
    };

    static calculate(input: CalculationInput): any {
        if (input.type === 'matrix') {
            const out = mat4.create();
            const result = mat4.invert(out, input.value);
            if (result === null) {
                throw new CalculationError('Determinant is 0; matrix cannot be inverted');
            }
            return result;
        }
        throw new Error(`${this.constructor.name} unsupported input type ${input.type}`);
    }
}

export class NormalizeOperation extends UnaryOperation {
    static defaultInputSockets = s.VECTOR;
    static defaultOutputSockets = s.VECTOR;

    static getOutputName(): string {
        return 'norm(X)';
    }
    // Only vector -> vector supported
    static inputToOutputTypeMap = {
        'scalar': s.INVALID,
        'vector': s.VECTOR,
        'matrix': s.INVALID,
    };

    static calculate(input: CalculationInput): any {
        if (input.type === 'vector') {
            const out = vec3.create();
            return vec3.normalize(out, input.value);
        }
        throw new Error(`${this.constructor.name} unsupported input type ${input.type}`);
    }
}

export class TransposeOperation extends UnaryOperation {
    static defaultInputSockets = s.MATRIX;
    static defaultOutputSockets = s.MATRIX;

    static getOutputName(): string {
        return 'Xᵀ';
    }
    // Only matrix -> matrix supported
    static inputToOutputTypeMap = {
        'scalar': s.INVALID,
        'vector': s.INVALID,
        'matrix': s.MATRIX,
    };

    static calculate(input: CalculationInput): any {
        if (input.type === 'matrix') {
            const out = mat4.create();
            return mat4.transpose(out, input.value);
        }
        throw new Error(`${this.constructor.name} unsupported input type ${input.type}`);
    }
}

export class DeterminantOperation extends UnaryOperation {
    static defaultInputSockets = s.MATRIX;
    static defaultOutputSockets = s.SCALAR;

    static getOutputName(): string {
        return '|X|';
    }
    // Only matrix -> scalar supported
    static inputToOutputTypeMap = {
        'scalar': s.INVALID,
        'vector': s.INVALID,
        'matrix': s.SCALAR,
    };

    static calculate(input: CalculationInput): any {
        if (input.type === 'matrix') {
            return [mat4.determinant(input.value)];
        }
        throw new Error(`${this.constructor.name} unsupported input type ${input.type}`);
    }
}

export const allUnaryOperations = Object.freeze({
    [UnaryOperationNodeType.LENGTH]:      LengthOperation,
    [UnaryOperationNodeType.INVERT]:      InvertOperation,
    [UnaryOperationNodeType.NORMALIZE]:   NormalizeOperation,
    [UnaryOperationNodeType.TRANSPOSE]:   TransposeOperation,
    [UnaryOperationNodeType.DETERMINANT]: DeterminantOperation,
});
