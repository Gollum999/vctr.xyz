import _ from 'lodash';
import { vec3, mat4 } from 'gl-matrix';
import Rete from 'rete';

import sockets from './sockets';
import util, { s } from './operation_util';
import { WarningControl, CalculationError } from './WarningControl.js';

class BinaryOperation {
    static title = null;
    static symbol = null;
    // TODO these should be "allowed" instead of "default"; when updating types, intersect with this, and remove connection if result is empty
    static defaultLhsSockets = s.anything;
    static defaultRhsSockets = s.anything;
    static defaultOutputSockets = s.anything;

    static getOutputName() {
        console.assert(this.symbol != null);
        return `A ${this.symbol} B`;
    }

    static setupSockets(editor, node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets[util.socketTypeListToSocketName(this.defaultLhsSockets)]));
        node.addInput(new Rete.Input('rhs', 'B', sockets[util.socketTypeListToSocketName(this.defaultRhsSockets)]));

        node.addControl(new WarningControl(editor, 'warning', 1));

        node.addOutput(new Rete.Output('result', this.getOutputName(), sockets[util.socketTypeListToSocketName(this.defaultOutputSockets)]));
    }

    static getNewSocketTypesFromInputs(lhsInput, rhsInput) {
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

    static updateInputSocketTypes(editor, editorNode) {
        const lhs = editorNode.inputs.get('lhs');
        const rhs = editorNode.inputs.get('rhs');
        const [newLhsTypes, newRhsTypes] = this.getNewSocketTypesFromInputs(lhs, rhs);

        util.updateIoType(lhs, newLhsTypes);
        util.updateIoType(rhs, newRhsTypes);

        // Remove the RHS connection if LHS type updates have made RHS incompatible
        // (LHS should never be incompatible since it is the first to update from input)
        util.removeInputConnectionsIfIncompatible(editor, rhs);
    }

    static updateOutputSocketTypes(editor, editorNode) {
        if (!this.inputToOutputTypeMap) {
            // console.log(`TEST updateOutputSocketTypes input to output type map is null, returning early (${editorNode.name})`);
            return;
        }

        const lhsTypes = util.getSocketTypes(editorNode.inputs.get('lhs').socket);
        const rhsTypes = util.getSocketTypes(editorNode.inputs.get('rhs').socket);

        // console.log(`TEST updateOutputSocketTypes ${editorNode.name}`);
        const expectedOutputTypes = this.getExpectedOutputTypes(lhsTypes, rhsTypes);
        // console.log('TEST updateOutputSocketTypes expectedOutputTypes =', expectedOutputTypes);
        if (expectedOutputTypes.has(util.invalid)) {
            throw new Error(`Cannot update output socket for "${editorNode.name}", input combination ("${lhsTypes}" and "${rhsTypes}") is invalid`);
        } else if (_.isEqual(expectedOutputTypes, s.ignore)) {
            // console.log(`TEST updateOutputSocketTypes expected output for "${editorNode.name}" is 'ignore', skipping (from "${lhsTypes}" "${rhsTypes}")`);
            return;
        }
        // console.log(`TEST updateOutputSocketTypes updating output for "${editorNode.name}" to`, expectedOutputTypes, '" (from "', lhsTypes, '" "', rhsTypes, ')');
        const output = editorNode.outputs.get('result');
        util.updateIoType(output, expectedOutputTypes); // TODO can check if update required for efficiency

        // If this output changed to a type that is no longer compatible with some of its connections, remove those connections
        util.removeOutputConnectionsIfIncompatible(editor, output);
    }

    static getExpectedOutputTypes(lhsTypeList, rhsTypeList) {
        // console.log(`TEST getExpectedOutputTypes "${lhsTypeList}" "${rhsTypeList}"`);
        const allExpectedTypes = new Set();
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
        if (_.isEqual(allExpectedTypes, s.invalid)) {
            throw new Error('Invalid type combination', allExpectedTypes, `(from "${lhsTypeList}" "${rhsTypeList}")`);
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

class AddOperation extends BinaryOperation {
    static title = 'Add';
    static symbol = '+';

    // Input and output socket types must always be in sync
    static lhsToRhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix };
    static rhsToLhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,  'vector': s.invalid, 'matrix': s.invalid },
        'vector':   { 'scalar': s.invalid, 'vector': s.vector,  'matrix': s.invalid },
        'matrix':   { 'scalar': s.invalid, 'vector': s.invalid, 'matrix': s.matrix  },
    };

    static calculate(lhs, rhs) {
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
        throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
    }
}

class SubtractOperation extends BinaryOperation {
    static title = 'Subtract';
    static symbol = '-';

    // Input and output socket types must always be in sync
    static lhsToRhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix };
    static rhsToLhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,  'vector': s.invalid, 'matrix': s.invalid },
        'vector':   { 'scalar': s.invalid, 'vector': s.vector,  'matrix': s.invalid },
        'matrix':   { 'scalar': s.invalid, 'vector': s.invalid, 'matrix': s.matrix  },
    };

    static calculate(lhs, rhs) {
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
        throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
    }
}

class MultiplyOperation extends BinaryOperation {
    static title = 'Multiply';
    static symbol = '*';

    static lhsToRhsTypeMap = { 'scalar': s.anything, 'vector': s.scalar,         'matrix': s.anything       };
    static rhsToLhsTypeMap = { 'scalar': s.anything, 'vector': s.scalarOrMatrix, 'matrix': s.scalarOrMatrix };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,   'vector': s.vector,  'matrix': s.matrix  },
        'vector':   { 'scalar': s.vector,   'vector': s.invalid, 'matrix': s.invalid },
        'matrix':   { 'scalar': s.matrix,   'vector': s.vector,  'matrix': s.matrix  },
    };

    static calculate(lhs, rhs) {
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
        throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
    }
}

class DivideOperation extends BinaryOperation {
    static title = 'Divide';
    static symbol = '/';
    static defaultLhsSockets = s.anything;
    static defaultRhsSockets = s.scalar;
    static defaultOutputSockets = s.anything;

    // RHS is static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,   'vector': s.invalid, 'matrix': s.invalid },
        'vector':   { 'scalar': s.vector,   'vector': s.invalid, 'matrix': s.invalid },
        'matrix':   { 'scalar': s.matrix,   'vector': s.invalid, 'matrix': s.invalid },
    };

    static calculate(lhs, rhs) {
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
        throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
    }
}

class DotOperation extends BinaryOperation {
    static title = 'Dot Product';
    static symbol = '·';
    static defaultLhsSockets = s.vector;
    static defaultRhsSockets = s.vector;
    static defaultOutputSockets = s.scalar;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static calculate(lhs, rhs) {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
        }
        return [vec3.dot(lhs.value, rhs.value)];
    }
}

class CrossOperation extends BinaryOperation {
    static title = 'Cross Product';
    static symbol = '×';
    static defaultLhsSockets = s.vector;
    static defaultRhsSockets = s.vector;
    static defaultOutputSockets = s.vector;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static calculate(lhs, rhs) {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
        }
        const out = vec3.create();
        return vec3.cross(out, lhs.value, rhs.value);
    }
}

class AngleOperation extends BinaryOperation {
    static title = 'Angle';
    static symbol = '∠';
    static defaultLhsSockets = s.vector;
    static defaultRhsSockets = s.vector;
    static defaultOutputSockets = s.scalar;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static getOutputName() {
        return `${this.symbol}AB`;
    }

    static calculate(lhs, rhs) {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
        }
        return [vec3.angle(lhs.value, rhs.value)];
    }
}

class ProjectionOperation extends BinaryOperation {
    static title = 'Projection';
    static symbol = null;
    static defaultLhsSockets = s.vector;
    static defaultRhsSockets = s.vector;
    static defaultOutputSockets = s.vector;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static getOutputName() {
        return `proj<sub> B </sub>A`;
    }

    static calculate(lhs, rhs) {
        if (lhs.type !== 'vector' || rhs.type !== 'vector') {
            throw new Error(this.title, 'unsupported input types', lhs.type, rhs.type);
        }
        const num = vec3.dot(lhs.value, rhs.value);
        const den = vec3.dot(rhs.value, rhs.value);
        const out = vec3.create();
        vec3.scale(out, rhs.value, num / den);
        return out;
    }
}

class ExponentOperation extends BinaryOperation {
    static title = 'Exponent';
    static symbol = null;
    static defaultLhsSockets = s.scalar;
    static defaultRhsSockets = s.scalar;
    static defaultOutputSockets = s.scalar;

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static getOutputName() {
        return 'A<sup>B</sup>';
    }

    static calculate(lhs, rhs) {
        if (lhs.type !== 'scalar' || rhs.type !== 'scalar') {
            throw new Error(`${this.title} unsupported input types`, lhs.type, rhs.type);
        }
        return [Math.pow(lhs.value, rhs.value)];
    }
}

export default {
    ADD:           AddOperation,
    SUBTRACT:      SubtractOperation,
    MULTIPLY:      MultiplyOperation,
    DIVIDE:        DivideOperation,
    DOT_PRODUCT:   DotOperation,
    CROSS_PRODUCT: CrossOperation,
    ANGLE:         AngleOperation,
    PROJECTION:    ProjectionOperation,
    EXPONENT:      ExponentOperation,
};
