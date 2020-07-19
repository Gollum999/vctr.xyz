import _ from 'lodash';
import { vec3, mat4 } from 'gl-matrix';
import Rete from 'rete';

import { SocketType, sockets, compoundSocket as s } from './sockets';
import util, { InputSocketCompatibilityMap, BinaryInputToOutputSocketMap } from './operation_util';
import { WarningControl, CalculationError } from './WarningControl';
import { BinaryOperationNodeType } from './node_util';
import type { NodeEditor } from 'rete/types/editor';
import type { Input } from 'rete/types/input';
import type { Node } from 'rete/types/node';

type InputTypesPair = [Set<SocketType>, Set<SocketType>];
type CalculationInput = { value: any, type: string };

export class BinaryOperation {
    static symbol: string | null = null;
    // TODO these should be "allowed" instead of "default"; when updating types, intersect with this, and remove connection if result is empty
    static defaultLhsSockets = s.ANYTHING;
    static defaultRhsSockets = s.ANYTHING;
    static defaultOutputSockets = s.ANYTHING;
    static lhsToRhsTypeMap: InputSocketCompatibilityMap | null = null;
    static rhsToLhsTypeMap: InputSocketCompatibilityMap | null = null;
    static inputToOutputTypeMap: BinaryInputToOutputSocketMap | null = null;

    static getOutputName(): string {
        console.assert(this.symbol != null);
        return `A ${this.symbol} B`;
    }

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        throw new Error('calculate not implemented');
    }

    static setupSockets(editor: NodeEditor, node: Node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets[util.socketTypesToCompoundSocket(this.defaultLhsSockets)]));
        node.addInput(new Rete.Input('rhs', 'B', sockets[util.socketTypesToCompoundSocket(this.defaultRhsSockets)]));

        node.addControl(new WarningControl(editor, 'warning', 1));

        node.addOutput(new Rete.Output('result', this.getOutputName(), sockets[util.socketTypesToCompoundSocket(this.defaultOutputSockets)]));
    }

    static getNewSocketTypesFromInputs(lhsInput: Input, rhsInput: Input): InputTypesPair {
        // console.log(`TEST getNewSocketTypesFromInputs ${editorNode.name}"`);

        // TODO this still isn't great.  _getNewSocketTypesFromInput should always filter down, then
        //      util.removeInputConnectionsIfIncompatible should remove if empty.
        // First, determine initial types for each socket based on the types connected to them (or the defaults)
        const lhsTypesFromInputConnection = util.getInputTypes(lhsInput);
        const rhsTypesFromInputConnection = util.getInputTypes(rhsInput);
        const lhsTypesFromInputSocket = util.getSocketTypes(lhsInput.socket);
        const rhsTypesFromInputSocket = util.getSocketTypes(rhsInput.socket);
        let newLhsSocketTypes = util.getNewSocketTypesFromInput(lhsTypesFromInputConnection, lhsTypesFromInputSocket, this.defaultLhsSockets);
        let newRhsSocketTypes = util.getNewSocketTypesFromInput(rhsTypesFromInputConnection, rhsTypesFromInputSocket, this.defaultRhsSockets);

        // Then determine new RHS type depending on types allowed for the current operation
        // We do RHS before LHS because we give LHS "priority" (RHS should have to change before LHS)
        if (this.lhsToRhsTypeMap !== null) {
            newRhsSocketTypes = util.getNewSocketTypeForOperationCompatibility(newRhsSocketTypes, newLhsSocketTypes, this.lhsToRhsTypeMap);
        }

        // Finally determine new LHS type depending on types allowed for the current operation
        if (this.rhsToLhsTypeMap !== null) {
            newLhsSocketTypes = util.getNewSocketTypeForOperationCompatibility(newLhsSocketTypes, newRhsSocketTypes, this.rhsToLhsTypeMap);
        }

        return [newLhsSocketTypes, newRhsSocketTypes];
    }

    static updateInputSocketTypes(editor: NodeEditor, editorNode: Node) {
        const lhs = editorNode.inputs.get('lhs');
        const rhs = editorNode.inputs.get('rhs');
        if (lhs == null || rhs == null) {
            throw new Error(`Input was null: ${lhs} ${rhs}`);
        }
        const [newLhsTypes, newRhsTypes] = this.getNewSocketTypesFromInputs(lhs, rhs);

        util.updateIoType(lhs, newLhsTypes);
        util.updateIoType(rhs, newRhsTypes);

        // Remove the RHS connection if LHS type updates have made RHS incompatible
        // (LHS should never be incompatible since it is the first to update from input)
        util.removeInputConnectionsIfIncompatible(editor, rhs);
    }

    static updateOutputSocketTypes(editor: NodeEditor, editorNode: Node) {
        if (!this.inputToOutputTypeMap) {
            // console.log(`TEST updateOutputSocketTypes input to output type map is null, returning early (${editorNode.name})`);
            return;
        }

        const lhs = editorNode.inputs.get('lhs');
        const rhs = editorNode.inputs.get('rhs');
        if (lhs == null || rhs == null) {
            throw new Error(`Input was null: ${lhs} ${rhs}`);
        }
        const lhsTypes = util.getSocketTypes(lhs.socket);
        const rhsTypes = util.getSocketTypes(rhs.socket);

        // console.log(`TEST updateOutputSocketTypes ${editorNode.name}`);
        const expectedOutputTypes = this.getExpectedOutputTypes(lhsTypes, rhsTypes);
        // console.log('TEST updateOutputSocketTypes expectedOutputTypes =', expectedOutputTypes);
        if (expectedOutputTypes.has(SocketType.INVALID)) {
            throw new Error(`Cannot update output socket for "${editorNode.name}", input combination ("${lhsTypes}" and "${rhsTypes}") is invalid`);
        } else if (_.isEqual(expectedOutputTypes, s.IGNORE)) {
            // console.log(`TEST updateOutputSocketTypes expected output for "${editorNode.name}" is 'ignore', skipping (from "${lhsTypes}" "${rhsTypes}")`);
            return;
        }
        // console.log(`TEST updateOutputSocketTypes updating output for "${editorNode.name}" to`, expectedOutputTypes, '" (from "', lhsTypes, '" "', rhsTypes, ')');
        const output = editorNode.outputs.get('result');
        if (output == null) {
            throw new Error('Output "result" not found');
        }
        util.updateIoType(output, expectedOutputTypes); // TODO can check if update required for efficiency

        // If this output changed to a type that is no longer compatible with some of its connections, remove those connections
        util.removeOutputConnectionsIfIncompatible(editor, output);
    }

    static getExpectedOutputTypes(lhsTypeList: Set<SocketType>, rhsTypeList: Set<SocketType>): Set<SocketType> {
        // console.log(`TEST getExpectedOutputTypes "${lhsTypeList}" "${rhsTypeList}"`);
        if (this.inputToOutputTypeMap == null) {
            throw new Error('inputToOutputTypeMap was not defined');
        }
        const allExpectedTypes = new Set<SocketType>();
        for (const lhs of lhsTypeList) {
            for (const rhs of rhsTypeList) {
                // console.log(`TEST getExpectedOutputTypes lhs "${lhs}" rhs "${rhs}"`);
                const expectedOutputTypeList = this.inputToOutputTypeMap[lhs][rhs];
                // console.log(`TEST getExpectedOutputTypes expected output type ${expectedOutputTypeList} from "${lhs}" "${rhs}"`);
                for (const t of expectedOutputTypeList) {
                    // console.log(`TEST getExpectedOutputTypes Adding output type ${t} from "${lhs}" "${rhs}"`);
                    allExpectedTypes.add(t);
                }
            }
        }

        // console.log(allExpectedTypes);
        if (_.isEqual(allExpectedTypes, s.INVALID)) {
            throw new Error(`Invalid type combination ${allExpectedTypes} (from "${lhsTypeList}" "${rhsTypeList}")`);
        } else {
            allExpectedTypes.delete(SocketType.INVALID);
        }
        if (_.isEqual(allExpectedTypes, s.IGNORE)) {
            return s.IGNORE;
        } else {
            allExpectedTypes.delete(SocketType.IGNORE);
        }
        // console.log(allExpectedTypes);

        return allExpectedTypes;
    }
}

export class AddOperation extends BinaryOperation {
    static symbol = '+';

    // Input and output socket types must always be in sync
    static lhsToRhsTypeMap = { 'scalar': s.SCALAR, 'vector': s.VECTOR, 'matrix': s.MATRIX };
    static rhsToLhsTypeMap = { 'scalar': s.SCALAR, 'vector': s.VECTOR, 'matrix': s.MATRIX };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.SCALAR,  'vector': s.INVALID, 'matrix': s.INVALID },
        'vector':   { 'scalar': s.INVALID, 'vector': s.VECTOR,  'matrix': s.INVALID },
        'matrix':   { 'scalar': s.INVALID, 'vector': s.INVALID, 'matrix': s.MATRIX  },
    };

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        // console.log('AddOperation', lhs, rhs);
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return [lhs.value[0] + rhs.value[0]];
        } else if (lhs.type === 'vector' && rhs.type === 'vector') {
            const out = vec3.create();
            return vec3.add(out, lhs.value, rhs.value);
        } else if (lhs.type === 'matrix' && rhs.type === 'matrix') {
            const out = mat4.create();
            return mat4.add(out, lhs.value, rhs.value);
        }
        throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
    }
}

export class SubtractOperation extends BinaryOperation {
    static symbol = '-';

    // Input and output socket types must always be in sync
    static lhsToRhsTypeMap = { 'scalar': s.SCALAR, 'vector': s.VECTOR, 'matrix': s.MATRIX };
    static rhsToLhsTypeMap = { 'scalar': s.SCALAR, 'vector': s.VECTOR, 'matrix': s.MATRIX };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.SCALAR,  'vector': s.INVALID, 'matrix': s.INVALID },
        'vector':   { 'scalar': s.INVALID, 'vector': s.VECTOR,  'matrix': s.INVALID },
        'matrix':   { 'scalar': s.INVALID, 'vector': s.INVALID, 'matrix': s.MATRIX  },
    };

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        // console.log(lhs, rhs);
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return [lhs.value[0] - rhs.value[0]];
        } else if (lhs.type === 'vector' && rhs.type === 'vector') {
            const out = vec3.create();
            return vec3.subtract(out, lhs.value, rhs.value);
        } else if (lhs.type === 'matrix' && rhs.type === 'matrix') {
            const out = mat4.create();
            return mat4.subtract(out, lhs.value, rhs.value);
        }
        throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
    }
}

export class MultiplyOperation extends BinaryOperation {
    static symbol = '*';

    static lhsToRhsTypeMap = { 'scalar': s.ANYTHING, 'vector': s.SCALAR,           'matrix': s.ANYTHING         };
    static rhsToLhsTypeMap = { 'scalar': s.ANYTHING, 'vector': s.SCALAR_OR_MATRIX, 'matrix': s.SCALAR_OR_MATRIX };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.SCALAR,   'vector': s.VECTOR,  'matrix': s.MATRIX  },
        'vector':   { 'scalar': s.VECTOR,   'vector': s.INVALID, 'matrix': s.INVALID },
        'matrix':   { 'scalar': s.MATRIX,   'vector': s.VECTOR,  'matrix': s.MATRIX  },
    };

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        // TODO how to clean this up and/or assert that all paths are covered?
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return [lhs.value[0] * rhs.value[0]];
        } else if (lhs.type === 'scalar' && rhs.type === 'vector') {
            const out = vec3.create();
            return vec3.scale(out, rhs.value, lhs.value[0]);
        } else if (lhs.type === 'scalar' && rhs.type === 'matrix') {
            const out = mat4.create();
            return mat4.multiplyScalar(out, rhs.value, lhs.value[0]);
        } else if (lhs.type === 'vector' && rhs.type === 'scalar') {
            const out = vec3.create();
            return vec3.scale(out, lhs.value, rhs.value[0]);
        } else if (lhs.type === 'matrix' && rhs.type === 'vector') {
            const out = vec3.create();
            const lhsT = mat4.create();
            mat4.transpose(lhsT, lhs.value); // gl-matrix is column-major, but I am row-major; transpose before calculating
            const result = vec3.transformMat4(out, rhs.value, lhsT);
            return result;
        } else if (lhs.type === 'matrix' && rhs.type === 'scalar') {
            const out = mat4.create();
            return mat4.multiplyScalar(out, lhs.value, rhs.value[0]);
        } else if (lhs.type === 'matrix' && rhs.type === 'matrix') {
            const out = mat4.create();
            const lhsT = mat4.create();
            const rhsT = mat4.create();
            mat4.transpose(lhsT, lhs.value); // gl-matrix is column-major, but I am row-major; transpose before and after calculating
            mat4.transpose(rhsT, rhs.value);
            mat4.multiply(out, lhsT, rhsT);
            return mat4.transpose(out, out);
        }
        throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
    }
}

export class DivideOperation extends BinaryOperation {
    static symbol = '/';
    static defaultLhsSockets = s.ANYTHING;
    static defaultRhsSockets = s.SCALAR;
    static defaultOutputSockets = s.ANYTHING;

    // RHS is static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.SCALAR,   'vector': s.INVALID, 'matrix': s.INVALID },
        'vector':   { 'scalar': s.VECTOR,   'vector': s.INVALID, 'matrix': s.INVALID },
        'matrix':   { 'scalar': s.MATRIX,   'vector': s.INVALID, 'matrix': s.INVALID },
    };

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        if (rhs.type === 'scalar') {
            if (rhs.value[0] === 0) {
                throw new CalculationError('Division by zero');
            }
            if (lhs.type === 'scalar') {
                return [lhs.value[0] / rhs.value[0]];
            } else if (lhs.type === 'vector') {
                const out = vec3.create();
                return vec3.scale(out, lhs.value, 1.0 / rhs.value[0]);
            } else if (lhs.type === 'matrix') {
                const out = mat4.create();
                return mat4.multiplyScalar(out, lhs.value, 1.0 / rhs.value[0]);
            }
        }
        throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
    }
}

export class DotOperation extends BinaryOperation {
    static symbol = '·';
    static defaultLhsSockets = s.VECTOR;
    static defaultRhsSockets = s.VECTOR;
    static defaultOutputSockets = s.SCALAR;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
        }
        return [vec3.dot(lhs.value, rhs.value)];
    }
}

export class CrossOperation extends BinaryOperation {
    static symbol = '×';
    static defaultLhsSockets = s.VECTOR;
    static defaultRhsSockets = s.VECTOR;
    static defaultOutputSockets = s.VECTOR;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
        }
        const out = vec3.create();
        return vec3.cross(out, lhs.value, rhs.value);
    }
}

export class AngleOperation extends BinaryOperation {
    static symbol = '∠';
    static defaultLhsSockets = s.VECTOR;
    static defaultRhsSockets = s.VECTOR;
    static defaultOutputSockets = s.SCALAR;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static getOutputName(): string {
        return `${this.symbol}AB`;
    }

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
        }
        return [vec3.angle(lhs.value, rhs.value)];
    }
}

export class ProjectionOperation extends BinaryOperation {
    static symbol = null;
    static defaultLhsSockets = s.VECTOR;
    static defaultRhsSockets = s.VECTOR;
    static defaultOutputSockets = s.VECTOR;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static getOutputName(): string {
        return `proj<sub> B </sub>A`;
    }

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
        }
        const num = vec3.dot(lhs.value, rhs.value);
        const den = vec3.dot(rhs.value, rhs.value);
        const out = vec3.create();
        vec3.scale(out, rhs.value, num / den);
        return out;
    }
}

export class ExponentOperation extends BinaryOperation {
    static symbol = null;
    static defaultLhsSockets = s.SCALAR;
    static defaultRhsSockets = s.SCALAR;
    static defaultOutputSockets = s.SCALAR;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static getOutputName(): string {
        return 'A<sup>B</sup>';
    }

    static calculate(lhs: CalculationInput, rhs: CalculationInput): any {
        if (lhs.type !== 'scalar' || rhs.type !== 'scalar') {
            throw new Error(`${this.constructor.name} unsupported input types ${lhs.type}, ${rhs.type}`);
        }
        return [Math.pow(lhs.value, rhs.value)];
    }
}

export const allBinaryOperations = Object.freeze({
    [BinaryOperationNodeType.ADD]:           AddOperation,
    [BinaryOperationNodeType.SUBTRACT]:      SubtractOperation,
    [BinaryOperationNodeType.MULTIPLY]:      MultiplyOperation,
    [BinaryOperationNodeType.DIVIDE]:        DivideOperation,
    [BinaryOperationNodeType.DOT_PRODUCT]:   DotOperation,
    [BinaryOperationNodeType.CROSS_PRODUCT]: CrossOperation,
    [BinaryOperationNodeType.ANGLE]:         AngleOperation,
    [BinaryOperationNodeType.PROJECTION]:    ProjectionOperation,
    [BinaryOperationNodeType.EXPONENT]:      ExponentOperation,
});
