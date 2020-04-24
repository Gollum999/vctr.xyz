import { vec3, mat4 } from 'gl-matrix';
import _ from 'lodash';
import Rete from 'rete';

import NodeRenderer from './NodeRenderer.vue';
import sockets from './sockets';
import util from '../util';
import nodeUtil, { GraphTraveler } from './node_util';

const invalid = 'INVALID'; // Sentinel indicating that the specified combination should never happen (raise an error if it does)
const ignore = 'IGNORE'; // Sentinel indicating that no changes need to be made
const s = Object.freeze({
    scalar:         new Set(['scalar']),
    vector:         new Set(['vector']),
    matrix:         new Set(['matrix']),
    scalarOrVector: new Set(['scalar', 'vector']),
    scalarOrMatrix: new Set(['scalar', 'matrix']),
    vectorOrMatrix: new Set(['vector', 'matrix']),
    anything:       new Set(['scalar', 'vector', 'matrix']),
    invalid:        new Set([invalid]),
    ignore:         new Set([ignore]),
});

function socketTypeListToSocketName(typeList) {
    if (!(typeList instanceof Set)) {
        throw new Error('socketTypeListToSocketName: Input should be of type Set');
    }
    switch (true) {
    case _.isEqual(typeList, s.scalar):         return 'scalar';
    case _.isEqual(typeList, s.vector):         return 'vector';
    case _.isEqual(typeList, s.matrix):         return 'matrix';
    case _.isEqual(typeList, s.scalarOrVector): return 'scalarOrVector';
    case _.isEqual(typeList, s.scalarOrMatrix): return 'scalarOrMatrix';
    case _.isEqual(typeList, s.vectorOrMatrix): return 'vectorOrMatrix';
    case _.isEqual(typeList, s.anything):       return 'anything';
    default: throw new Error(`Could not determine socket name from list "${Array.from(typeList).join(',')}"`);
    }
}

// TODO There should be a way to avoid this...
function getSocketTypes(socket) {
    switch (socket.name) {
    case 'Scalar value':     return s.scalar;
    case 'Vector value':     return s.vector;
    case 'Matrix value':     return s.matrix;
    case 'Scalar or Vector': return s.scalarOrVector;
    case 'Scalar or Matrix': return s.scalarOrMatrix;
    case 'Vector or Matrix': return s.vectorOrMatrix;
    case 'Anything':         return s.anything;
    default: throw new Error(`Could not find socket type for name "${socket.name}"`);
    }
}

function updateIoType(io, socketTypeNameOrList) {
    // console.log('TEST updateIoType ', io.node.name, io.name, 'to', socketTypeNameOrList, typeof socketTypeNameOrList);
    const socketTypeName = (() => {
        if (typeof socketTypeNameOrList === 'string') {
            return socketTypeNameOrList;
        } else {
            return socketTypeListToSocketName(socketTypeNameOrList);
        }
    })();

    const newSocket = sockets[socketTypeName];
    if (_.isNil(newSocket)) {
        throw new Error(`Could not find socket named ${socketTypeName}`);
    }
    io.socket = newSocket;
    // console.log('TEST new io:');
    // console.log(io);

    io.node.update(); // TODO may want to pull this out to worker() to only do once for performance
    // console.log('TEST updateIoType END');
}

function getInputTypes(input) {
    // console.log(input);
    console.assert(input.connections.length <= 1);
    if (_.isEmpty(input.connections)) {
        return null; // TODO probably better to return empty list?
    } else {
        return getSocketTypes(input.connections[0].output.socket);
    }
}

function _getNewSocketTypesFromInput(typesFromInputConnection, typesFromInputSocket, defaultTypes) {
    // console.log(`TEST _getNewSocketTypesFromInput ${input.node.name} "${typesFromInputConnection}" "${defaultTypes}"`);
    if (_.isNil(typesFromInputConnection)) { // TODO allowing this to be null is a bit annoying
        // const newTypes = util.intersection(getSocketTypes(input.socket), defaultTypes);
        return defaultTypes;
    } else if (!_.isEqual(typesFromInputConnection, typesFromInputSocket)) {
        // console.log(`TEST updating ${input.node.name} socket type from "${getSocketTypes(input.socket)}" to "${typesFromInputConnection}"`);
        // console.log('TEST defaultTypes:', defaultTypes);
        const newTypes = util.intersection(typesFromInputConnection, defaultTypes);
        // console.log('TEST newTypes:', newTypes);
        if (!_.isEmpty(newTypes)) {
            return newTypes;
        }
    }
    return typesFromInputSocket;
}

function _getNewSocketTypeForOperationCompatibility(socketTypes, oppositeSocketTypes, oppositeTypeToThisTypeMap) {
    // if (!oppositeTypeToThisTypeMap) {
    //     throw new Error('oppositeTypeToThisTypeMap was null', oppositeTypeToThisTypeMap); // TODO why am I letting this be null?
    // }
    // console.log(`TEST _getNewSocketTypeForOperationCompatibility ${input.node.name} ${input.name} (opposite ${oppositeInput.name})"`);

    const compatibleTypes = new Set();
    for (const socketType of oppositeSocketTypes) {
        // TODO this doesn't feel quite right... like it might choose socket types that are "too loose"
        // TODO maybe I need to explicitly list type mappings for hybrid types instead of auto-aggregating here
        if (oppositeTypeToThisTypeMap[socketType]) {
            // TODO variable names are hard
            for (const otherSideCompatibleType of oppositeTypeToThisTypeMap[socketType]) {
                compatibleTypes.add(otherSideCompatibleType);
            }
        }
    }
    // console.log('oppositeSocketTypes:', oppositeSocketTypes, 'compatibleTypes:', compatibleTypes);

    if (!_.isEmpty(compatibleTypes)) {
        // console.log(`_getNewSocketTypeForOperationCompatibility ${input.node.name} ${input.name}, current types:`, socketTypes, 'compat:', compatibleTypes);
        // if (!_.isEmpty(input.connections)) {
        //     // Sanity check that previous socket type updates kept everything compatible
        //     console.log('TEST input has connection, verifying types are still compatible (types: "', socketTypes, '", compat: "', compatibleTypes, '"');
        //     // TODO maybe removeInputConnectionsIfIncompatible should happen here?
        //     // console.assert(util.isSubset(socketTypes, compatibleTypes), socketTypes, compatibleTypes);
        // } else
        if (util.isSubset(socketTypes, compatibleTypes)) {
            // console.log('TEST _getNewSocketTypeForOperationCompatibility updating', input.node.name, input.name, 'from', socketTypes, 'to', compatibleTypes);
            return socketTypes;
        } else {
            return compatibleTypes;
        }
    } else {
        throw new Error(`Could not determine compatible types between ${[...socketTypes].join(',')} and ${[...oppositeSocketTypes].join(',')}`);
    }
}

function removeInputConnectionsIfIncompatible(editor, input) {
    _removeIoConnectionsIfIncompatible(editor, input, true);
}

function removeOutputConnectionsIfIncompatible(editor, output) {
    _removeIoConnectionsIfIncompatible(editor, output, false);
}

function _removeIoConnectionsIfIncompatible(editor, io, isInput) {
    // console.log('TEST _removeIoConnectionsIfIncompatible io:', io.name, 'isInput:', isInput, 'cxns empty:', _.isEmpty(io.connections));
    const socketTypes = getSocketTypes(io.socket);
    for (const connection of io.connections) {
        const typesFromInput = getSocketTypes(isInput ? connection.output.socket : connection.input.socket);
        // console.log('connection:', connection);
        // console.log('typesFromInput:', typesFromInput, 'socketTypes:', socketTypes);
        if (!util.intersects(socketTypes, typesFromInput)) {
            // console.log(`TEST ${isInput ? 'input' : 'output'} connection incompatible, REMOVING`);
            // console.log(socketTypes, typesFromInput, connection);
            // TODO this puts itself into the undo history *after* the connection that triggered this, so undoing will fail since socket
            //      type has changed.  Need to hijack the default 'connectioncreated' event or something
            editor.removeConnection(connection); // TODO dangerous to call this while iterating over connections?
        }
    }
}

// Engine updates have to happen *before* this because they set up the data we iterate over
export function updateAllSockets(engine, editor) {
    const graphTraveler = new GraphTraveler(engine, editor);
    graphTraveler.applyToAllNodes((engineNode, editorNode) => {
        const operation = Operation[engineNode.name];
        if (_.isNil(operation)) {
            return;
        }

        // console.log(`BasicOperationComponent updateAllSockets (${editorNode.name})`);
        // console.log(this.editor);
        // console.log(engineNode);
        // console.log(inputs);
        // console.log(outputs);
        // console.log(editorNode);
        // console.log(editorNode.inputs);
        // console.log(editorNode.outputs);

        const inputArray = Array.from(editorNode.inputs);
        // console.log(inputArray);

        // const hasDynamicInputSockets = !_.isNil(operation.lhsToRhsTypeMap) || !_.isNil(operation.rhsToLhsTypeMap);
        // const hasDynamicOutputSocket = !_.isNil(operation.inputToOutputTypeMap);

        // TODO can probably be more efficient here
        const anyConnectionEmpty = (inputArray.some(([name, input]) => {
            // console.log(`TEST ${editorNode.name} connection empty, flagging for update`);
            return _.isEmpty(input.connections);
        }));

        const anySocketTypeMismatch = (inputArray.some(([name, input]) => {
            console.assert(input.connections.length <= 1); // Enforced by editor
            if (_.isEmpty(input.connections)) {
                return false;
            }
            const connection = input.connections[0];
            // TODO doesn't account for compatible sockets with different names, though I am not using those yet outside of 'Anything' sockets
            // TODO checking by socket name is overlay aggressive; could instead check for type subset
            return connection.input.socket.name !== connection.output.socket.name;
        }));

        // const needsUpdate = hasDynamicInputSockets && (anyConnectionEmpty || anySocketTypeMismatch); // TODO dynamic also could just mean that the socket can go from 'anything' to input type
        const needsUpdateFromInputs = anyConnectionEmpty || anySocketTypeMismatch;
        // console.log('TEST', editorNode.name, 'needs input update?', needsUpdateFromInputs);
        if (needsUpdateFromInputs) {
        // if (true) {
            // First, update each input socket based on its connection and based on what types the current operation allows
            operation.updateInputSocketTypes(editor, editorNode);
        }

        // Then update output socket type based on input socket types
        operation.updateOutputSocketTypes(editor, editorNode);
    });
}

class BaseOperation {
    static title = null;
    static symbol = null;
    // TODO these should be "allowed" instead of "default"; when updating types, intersect with this, and remove connection if result is empty
    static defaultLhsSockets = s.anything;
    static defaultRhsSockets = s.anything;
    static defaultOutputSockets = s.anything;

    static getOutputName() {
        return `A ${this.symbol} B`;
    }

    static setupSockets(node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets[socketTypeListToSocketName(this.defaultLhsSockets)]));
        node.addInput(new Rete.Input('rhs', 'B', sockets[socketTypeListToSocketName(this.defaultRhsSockets)]));
        node.addOutput(new Rete.Output('result', this.getOutputName(), sockets[socketTypeListToSocketName(this.defaultOutputSockets)]));
    }

    static getNewSocketTypesFromInputs(lhsInput, rhsInput) {
        // console.log(`TEST getNewSocketTypesFromInputs ${editorNode.name}"`);

        // TODO this still isn't great.  _getNewSocketTypesFromInput should always filter down, then
        //      removeInputConnectionsIfIncompatible should remove if empty.
        // First, determine initial types for each socket based on the types connected to them (or the defaults)
        const lhsTypesFromInputConnection = getInputTypes(lhsInput);
        const rhsTypesFromInputConnection = getInputTypes(rhsInput);
        const lhsTypesFromInputSocket = getSocketTypes(lhsInput.socket);
        const rhsTypesFromInputSocket = getSocketTypes(rhsInput.socket);
        let newLhsSocketTypes = _getNewSocketTypesFromInput(lhsTypesFromInputConnection, lhsTypesFromInputSocket, this.defaultLhsSockets);
        let newRhsSocketTypes = _getNewSocketTypesFromInput(rhsTypesFromInputConnection, rhsTypesFromInputSocket, this.defaultRhsSockets);

        // Then determine new RHS type depending on types allowed for the current operation
        // We do RHS before LHS because we give LHS "priority" (RHS should have to change before LHS)
        if (this.lhsToRhsTypeMap !== null) {
            newRhsSocketTypes = _getNewSocketTypeForOperationCompatibility(newRhsSocketTypes, newLhsSocketTypes, this.lhsToRhsTypeMap);
        }

        // Finally determine new LHS type depending on types allowed for the current operation
        if (this.rhsToLhsTypeMap !== null) {
            newLhsSocketTypes = _getNewSocketTypeForOperationCompatibility(newLhsSocketTypes, newRhsSocketTypes, this.rhsToLhsTypeMap);
        }

        return [newLhsSocketTypes, newRhsSocketTypes];
    }

    static updateInputSocketTypes(editor, editorNode) {
        const lhs = editorNode.inputs.get('lhs');
        const rhs = editorNode.inputs.get('rhs');
        const [newLhsTypes, newRhsTypes] = this.getNewSocketTypesFromInputs(lhs, rhs);

        updateIoType(lhs, newLhsTypes);
        updateIoType(rhs, newRhsTypes);

        // Remove the RHS connection if LHS type updates have made RHS incompatible
        // (LHS should never be incompatible since it is the first to update from input)
        removeInputConnectionsIfIncompatible(editor, rhs);
    }

    static updateOutputSocketTypes(editor, editorNode) {
        if (!this.inputToOutputTypeMap) {
            // console.log(`TEST updateOutputSocketTypes input to output type map is null, returning early (${editorNode.name})`);
            return;
        }

        const lhsTypes = getSocketTypes(editorNode.inputs.get('lhs').socket);
        const rhsTypes = getSocketTypes(editorNode.inputs.get('rhs').socket);

        // console.log(`TEST updateOutputSocketTypes ${editorNode.name}`);
        const expectedOutputTypes = this.getExpectedOutputTypes(lhsTypes, rhsTypes);
        // console.log('TEST updateOutputSocketTypes expectedOutputTypes =', expectedOutputTypes);
        if (expectedOutputTypes.has(invalid)) {
            throw new Error(`Cannot update output socket for "${editorNode.name}", input combination ("${lhsTypes}" and "${rhsTypes}") is invalid`);
        } else if (_.isEqual(expectedOutputTypes, s.ignore)) {
            // console.log(`TEST updateOutputSocketTypes expected output for "${editorNode.name}" is 'ignore', skipping (from "${lhsTypes}" "${rhsTypes}")`);
            return;
        }
        // console.log(`TEST updateOutputSocketTypes updating output for "${editorNode.name}" to`, expectedOutputTypes, '" (from "', lhsTypes, '" "', rhsTypes, ')');
        const output = editorNode.outputs.get('result');
        updateIoType(output, expectedOutputTypes); // TODO can check if update required for efficiency

        // If this output changed to a type that is no longer compatible with some of its connections, remove those connections
        removeOutputConnectionsIfIncompatible(editor, output);
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
            allExpectedTypes.delete(invalid);
        }
        if (_.isEqual(allExpectedTypes, s.ignore)) {
            return s.ignore;
        } else {
            allExpectedTypes.delete(ignore);
        }
        // console.log(allExpectedTypes);

        return allExpectedTypes;
    }
}

class AddOperation extends BaseOperation {
    static title = 'Add';
    static symbol = '+';

    // Output socket types must always be in sync
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
        throw new Error('AddOperation unsupported input types', lhs.type, rhs.type);
    }
}

class SubtractOperation extends BaseOperation {
    static title = 'Subtract';
    static symbol = '-';

    // Input socket types must always be in sync
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
        throw new Error('SubtractOperation unsupported input types', lhs.type, rhs.type);
    }
}

class MultiplyOperation extends BaseOperation {
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
            return mat4.transpose(out, out); // TODO will this work, or do I need a second temp matrix?
        }
        throw new Error('MultiplyOperation unsupported input types', lhs.type, rhs.type);
    }
}

class DivideOperation extends BaseOperation {
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
        // TODO handle division by 0 here
        if (rhs.type === 'scalar') {
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
        throw new Error('DivideOperation unsupported input types', lhs.type, rhs.type);
    }
}

class DotOperation extends BaseOperation {
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
            throw new Error('DotOperation unsupported input types', lhs.type, rhs.type);
        }
        return [vec3.dot(lhs.value, rhs.value)];
    }
}

class CrossOperation extends BaseOperation {
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
            throw new Error('CrossOperation unsupported input types', lhs.type, rhs.type);
        }
        const out = vec3.create();
        return vec3.cross(out, lhs.value, rhs.value);
    }
}

// TODO Hack, clean this up; all these operations no longer need to be Rete Components for the most part
export const Operation = Object.freeze({
    'Add':           AddOperation,
    'Subtract':      SubtractOperation,
    'Multiply':      MultiplyOperation,
    'Divide':        DivideOperation,
    'Dot Product':   DotOperation,
    'Cross Product': CrossOperation,
});

export class BasicOperationComponent extends Rete.Component {
    constructor(opName) {
        // Note that the Rete engine does some node lookups by name, so each node type must have a unique name.
        // This is especially important in here where I give the component some state; if the name is shared anywhere it will look up
        //   the wrong worker() function during engine processing
        super(Operation[opName].title);
        this.data.component = NodeRenderer;

        this.opName = opName;
    }

    builder(node) {
        Operation[this.opName].setupSockets(node);
        return node;
    }

    worker(engineNode, inputs, outputs) {
        const operation = Operation[this.opName];

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
        let result = operation.calculate({type: determineType(lhsValue), value: lhsValue}, {type: determineType(rhsValue), value: rhsValue});
        if (result instanceof Float32Array) {
            // Float32Array serializes as an object instead of a regular array; force types to be consistent
            // TODO how will this look for matrices?  should this be the receiving node's responsibility?
            result = Array.from(result);
        }
        outputs['result'] = result;
    }
};
