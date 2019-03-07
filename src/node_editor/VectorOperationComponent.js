import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { vec3 } from 'gl-matrix';

const invalid = 'INVALID'; // Sentinel indicating that the specified combination should never happen (raise an error if it does)
const ignore = 'IGNORE'; // Sentinel indicating that no changes need to be made
const s = Object.freeze({
    scalar:         ['scalar'],
    vector:         ['vector'],
    matrix:         ['matrix'],
    scalarOrVector: ['scalar', 'vector'],
    scalarOrMatrix: ['scalar', 'matrix'],
    vectorOrMatrix: ['vector', 'matrix'],
    anything:       ['anything'],
    invalid:        [invalid],
    ignore:         [ignore],
});

// function isSubset(maybeSubset, maybeSuperset) {
//     const superset = new Set(maybeSuperset);
//     return Array.from(maybeSubset).every(val => superset.has(val));
// }

function intersects(x, y) {
    const ySet = new Set(y);
    return Array.from(x).some(val => ySet.has(val));
}

function intersection(x, y) {
    return new Set([...x].filter(val => y.has(val)));
}

function socketTypeListToSocketName(typeList) {
    // Ew.
    typeList = new Set(typeList); // In case input is an array
    if (typeList.has('anything')) {
        return 'anything';
    } else if (typeList.size === 3) {
        console.assert(typeList.has('scalar') &&
                       typeList.has('vector') &&
                       typeList.has('matrix'));
        return 'anything';
    } else if (typeList.size === 2) {
        if (typeList.has('scalar') && typeList.has('vector')) {
            return 'scalarOrVector';
        } else if (typeList.has('scalar') && typeList.has('matrix')) {
            return 'scalarOrMatrix';
        } else if (typeList.has('vector') && typeList.has('matrix')) {
            return 'vectorOrMatrix';
        } else {
            throw new Error(`Could not determine socket name from list "${JSON.stringify(typeList)}"`);
        }
    } else if (typeList.size === 1) {
        return typeList.values().next().value;
    }
    throw new Error(`Could not determine socket name from list "${JSON.stringify(typeList)}"`);
}

// TODO I'm sure there is a way to avoid this
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
    // console.log(`TEST updateIoType "${io.node.name}" "${io.name}" "${socketTypeNameOrList}" ${typeof socketTypeNameOrList}`);
    // console.log(socketTypeNameOrList);
    // console.log(io);
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

    // TODO how much am I breaking by changing socket type like this?  need to reestablish connections or anything?
    io.node.update(); // TODO may want to pull this out to worker() to only do once for performance
    // console.log('TEST updateIoType END');
}

class BaseOperation {
    static title = null;
    static symbol = null;
    static defaultLhsSocket = 'anything';
    static defaultRhsSocket = 'anything';
    static defaultOutputSocket = 'anything';

    static getOutputName() {
        return `A ${this.symbol} B`;
    }

    static setupSockets(node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets[this.defaultLhsSocket]));
        node.addInput(new Rete.Input('rhs', 'B', sockets[this.defaultRhsSocket]));
        node.addOutput(new Rete.Output('result', this.getOutputName(), sockets[this.defaultOutputSocket]));
    }

    static updateSocketTypesFromInputs(editorNode, lhsInputTypes, rhsInputTypes) {
        // console.log(`TEST updateSocketTypesFromInputs ${editorNode.name} LHS "${lhsInputTypes}" RHS "${rhsInputTypes}"`);
        this._updateSocketTypeFromInput(editorNode.inputs.get('lhs'), lhsInputTypes);
        this._updateSocketTypeFromInput(editorNode.inputs.get('rhs'), rhsInputTypes);
    }

    // TODO once again, the 'anything' type is causing problems...
    static expandAnything(socketTypes) {
        if (_.isEqual(socketTypes, ['anything'])) {
            return new Set(['scalar', 'vector', 'matrix']);
        } else {
            return new Set(socketTypes);
        }
    }

    static _updateSocketTypeFromInput(input, inputTypes) {
        const defaultSocketType = {
            'lhs': this.defaultLhsSocket,
            'rhs': this.defaultRhsSocket,
        }[input.key]; // TODO this is pretty gross, clean up
        if (_.isNil(inputTypes)) { // TODO allowing this to be null is a bit annoying
            // console.log(`TEST inputTypes is null, setting ${input.node.name} socket type to "anything"`);
            updateIoType(input, defaultSocketType);
            // inputTypes = sockets.anything; // TODO why did I do this originally?
        } else if (!_.isEqual(inputTypes, getSocketTypes(input.socket))) {
            // console.log(`TEST updating ${input.node.name} socket type from "${getSocketTypes(input.socket)}" to "${inputTypes}"`);
            const newTypes = intersection(this.expandAnything(inputTypes), this.expandAnything([defaultSocketType]));
            // console.log(`TEST newTypes:`);
            // TODO I am so inconsistent with which values are strings and which are arrays/sets...
            // console.log(this.expandAnything(inputTypes), this.expandAnything([defaultSocketType]), newTypes);
            if (!_.isEmpty(newTypes)) {
                updateIoType(input, newTypes);
            }
        }
    }

    // TODO better to pass in just the node/sockets?
    static updateSocketTypesForOperationCompatibility(editorNode, lhsTypes, rhsTypes) {
        // console.log(`TEST updateSocketTypesForOperationCompatibility ${editorNode.name} LHS "${lhsTypes}" RHS "${rhsTypes}"`);
        if (!this.lhsToRhsTypeMap || !this.rhsToLhsTypeMap) {
            // console.log(`TEST an input type map is null, returning early (${editorNode.name} ${lhsTypes} ${rhsTypes})`);
            // console.log(this.lhsToRhsTypeMap);
            // console.log(this.rhsToLhsTypeMap);
            return;
        }

        const expectedLhsTypes = new Set();
        const expectedRhsTypes = new Set();
        for (const rhsType of rhsTypes) {
            // TODO this doesn't feel quite right... like it might choose socket types that are "too loose"
            // TODO maybe I need to explicitly list type mappings for hybrid types instead of auto-aggregating here
            if (this.rhsToLhsTypeMap[rhsType]) {
                for (const lhsType of this.rhsToLhsTypeMap[rhsType]) {
                    expectedLhsTypes.add(lhsType);
                }
            }
        }
        for (const lhsType of lhsTypes) {
            if (this.lhsToRhsTypeMap[lhsType]) {
                for (const rhsType of this.lhsToRhsTypeMap[lhsType]) {
                    expectedRhsTypes.add(rhsType);
                }
            }
        }
        this._updateSocketTypeForOperationCompatibility(editorNode.inputs.get('lhs'), lhsTypes, expectedLhsTypes);
        this._updateSocketTypeForOperationCompatibility(editorNode.inputs.get('rhs'), rhsTypes, expectedRhsTypes);
    }

    static _updateSocketTypeForOperationCompatibility(socket, socketTypes, expectedSocketTypes) {
        // console.log(`TEST _updateSocketTypeForOperationCompatibility ${socket.node.name} ${socket.name}, "${socketTypes}" expecting "${JSON.stringify(expectedSocketTypes)}"`);

        // TODO this assumes that only one input can change per update, otherwise I will need to do something smarter based on which conn was last added
        // TODO   maybe on connection created, check if still compatible, and if not, remove old one
        // TODO what if I have one type connected, and then switch to a new type that is incompatible with sibling type?
        // TODO what about "hybrid" socket types?  probably need to do something similar to updateOutputSocketTypes
        if (!_.isEmpty(expectedSocketTypes)) {
            // TODO this should check whether or not an input is connected, don't assume 'anything' means no connections
            // console.log(socketTypes);
            // console.log(expectedSocketTypes);
            // console.log(new Set(['anything']));
            // console.log(`${JSON.stringify(socketTypes)} ${JSON.stringify(expectedSocketTypes)} ${JSON.stringify(new Set(['anything']))}`);
            if (!_.isEqual(new Set(socketTypes), new Set(s.anything))) {
                // Sanity check that previous socket type updates kept everything compatible
                // console.log('TEST socketTypes !== anything, verifying types are still compatible');
                console.assert(socketTypes.every((socketType) => {
                    return expectedSocketTypes.has(socketType) || expectedSocketTypes.has('anything') || socketType === 'anything';
                }), socketTypes, expectedSocketTypes);
            } else if (!_.isEqual(socketTypes, expectedSocketTypes)) {
                // console.log(`TEST _updateSocketTypeForOperationCompatibility updating "${socket.node.name}" ${socket.name} from "${socketTypes}" to "${JSON.stringify(expectedSocketTypes)}"`);
                updateIoType(socket, expectedSocketTypes);
            }
        } else {
            console.log('expectedSocketTypes was empty'); // TODO will this happen often?
        }
    }

    static updateOutputSocketTypes(editor, editorNode, lhsTypes, rhsTypes) {
        if (!this.inputToOutputTypeMap) {
            // console.log(`TEST updateOutputSocketTypes input to output type map is null, returning early (${editorNode.name} ${lhsTypes} ${rhsTypes})`);
            return;
        }

        // console.log(`TEST updateOutputSocketTypes ${editorNode.name}`);
        const expectedOutputTypes = this.getExpectedOutputTypes(lhsTypes, rhsTypes);
        // console.log(`TEST updateOutputSocketTypes expectedOutputTypes = ${JSON.stringify(expectedOutputTypes)}`);
        if (expectedOutputTypes.has(invalid)) {
            throw new Error(`Cannot update output socket for "${editorNode.name}", input combination ("${lhsTypes}" and "${rhsTypes}") is invalid`);
        } else if (_.isEqual(expectedOutputTypes, new Set(s.ignore))) {
            console.log(`TEST updateOutputSocketTypes expected output for "${editorNode.name}" is 'ignore', skipping (from "${lhsTypes}" "${rhsTypes}")`);
            return;
        }
        // console.log(`TEST updateOutputSocketTypes updating output for "${editorNode.name}" to "${JSON.stringify(expectedOutputTypes)}" (from "${lhsTypes}" "${rhsTypes}")`);
        updateIoType(editorNode.outputs.get('result'), expectedOutputTypes); // TODO can check if update required

        // If this output changed to a type that is no longer compatible with some of its connections, remove those connections
        const output = editorNode.outputs.get('result');
        // console.log(output);
        if (!_.isEmpty(output.connections)) {
            for (const connection of editorNode.outputs.get('result').connections) {
                const outputTypes = getSocketTypes(connection.input.socket);
                if (!intersects(expectedOutputTypes, outputTypes) && !expectedOutputTypes.has('anything') && !outputTypes.includes('anything')) { // TODO still not perfect, but should be fine for now
                    // console.log(`TEST output connection incompatible, removing`);
                    // console.log(expectedOutputTypes, outputTypes, connection);
                    editor.removeConnection(connection); // TODO dangerous to call this while iterating over connections?
                }
            }
        }
    }

    static getExpectedOutputTypes(lhsTypeList, rhsTypeList) {
        // console.log(`TEST getExpectedOutputTypes "${lhsTypeList}" "${rhsTypeList}"`);
        const allExpectedTypes = new Set();
        for (const lhs of lhsTypeList) {
            for (const rhs of rhsTypeList) {
                // console.log(`TEST getExpectedOutputTypes lhs "${lhs}" rhs "${rhs}"`);
                const temp = this.inputToOutputTypeMap[lhs];
                // console.log(temp);
                const expectedOutputTypeList = temp[rhs];
                // console.log(`TEST getExpectedOutputTypes expected output type ${expectedOutputTypeList} from "${lhs}" "${rhs}"`);
                for (const t of expectedOutputTypeList) {
                    // console.log(`TEST getExpectedOutputTypes Adding output type ${t} from "${lhs}" "${rhs}"`);
                    allExpectedTypes.add(t);
                }
            }
        }

        // console.log(allExpectedTypes);
        if (invalid in allExpectedTypes) {
            throw new Error(`Invalid type combination ${allExpectedTypes}`);
        }
        if (_.isEqual(allExpectedTypes, new Set(s.ignore))) {
            return new Set(s.ignore);
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
    static lhsToRhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix, 'anything': s.anything };
    static rhsToLhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix, 'anything': s.anything };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,  'vector': s.invalid, 'matrix': s.invalid, 'anything': s.ignore   },
        'vector':   { 'scalar': s.invalid, 'vector': s.vector,  'matrix': s.invalid, 'anything': s.ignore   },
        'matrix':   { 'scalar': s.invalid, 'vector': s.invalid, 'matrix': s.matrix,  'anything': s.ignore   },
        'anything': { 'scalar': s.ignore,  'vector': s.ignore,  'matrix': s.ignore,  'anything': s.anything },
    };

    static calculate(lhs, rhs) {
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return lhs.value + rhs.value;
        } else if (lhs.type === 'vector' && rhs.type === 'vector') {
            const out = vec3.create();
            return vec3.add(out, lhs.value, rhs.value);
        } else if (lhs.type === 'matrix' && rhs.type === 'matrix') {
            throw new Error('Not implemented'); // TODO
        } else {
            throw new Error(`AddOperation unsupported input types ${lhs.type.name} ${rhs.type.name}`);
        }
    }
}

class SubtractOperation extends BaseOperation {
    static title = 'Subtract';
    static symbol = '-';

    // Input socket types must always be in sync
    static lhsToRhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix, 'anything': s.anything };
    static rhsToLhsTypeMap = { 'scalar': s.scalar, 'vector': s.vector, 'matrix': s.matrix, 'anything': s.anything };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,  'vector': s.invalid, 'matrix': s.invalid, 'anything': s.ignore   },
        'vector':   { 'scalar': s.invalid, 'vector': s.vector,  'matrix': s.invalid, 'anything': s.ignore   },
        'matrix':   { 'scalar': s.invalid, 'vector': s.invalid, 'matrix': s.matrix,  'anything': s.ignore   },
        'anything': { 'scalar': s.ignore,  'vector': s.ignore,  'matrix': s.ignore,  'anything': s.anything },
    };

    static calculate(lhs, rhs) {
        // console.log(lhs, rhs);
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return lhs.value - rhs.value;
        } else if (lhs.type === 'vector' && rhs.type === 'vector') {
            const out = vec3.create();
            return vec3.subtract(out, lhs.value, rhs.value);
        } else if (lhs.type === 'matrix' && rhs.type === 'matrix') {
            throw new Error('Not implemented'); // TODO
        } else {
            throw new Error(`SubtractOperation unsupported input types ${lhs.type} ${rhs.type}`);
        }
    }
}

class MultiplyOperation extends BaseOperation {
    static title = 'Multiply';
    static symbol = '*';

    // TODO I think 'anything' needs to become ['scalar', 'vector', 'matrix']... but then I can't use it as key below...
    // TODO   Though I think I can derive the values for 'anything' from the basic types
    // TODO just make all of these sets for consistency
    static lhsToRhsTypeMap = { 'scalar': s.anything, 'vector': s.scalarOrMatrix, 'matrix': s.scalarOrMatrix };
    static rhsToLhsTypeMap = { 'scalar': s.anything, 'vector': s.scalar,         'matrix': s.anything       };
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,   'vector': s.vector,  'matrix': s.matrix,         'anything': s.ignore   },
        'vector':   { 'scalar': s.vector,   'vector': s.invalid, 'matrix': s.vector,         'anything': s.vector   },
        'matrix':   { 'scalar': s.matrix,   'vector': s.invalid, 'matrix': s.matrix,         'anything': s.matrix   },
        'anything': { 'scalar': s.anything, 'vector': s.vector,  'matrix': s.vectorOrMatrix, 'anything': s.anything },
    };

    static calculate(lhs, rhs) {
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return lhs.value * rhs.value;
        } else if (lhs.type === 'vector') {
            const out = vec3.create();
            return vec3.scale(out, lhs.value, rhs.value);
        } else if (rhs.type === 'vector') {
            const out = vec3.create();
            return vec3.scale(out, rhs.value, lhs.value);
        }
    }
}

class DivideOperation extends BaseOperation {
    static title = 'Divide';
    static symbol = '/';
    static defaultLhsSocket = 'anything';
    static defaultRhsSocket = 'scalar';
    static defaultOutputSocket = 'anything';

    // RHS is static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = {
        // lhsType: { rhsType: [outputTypes] }
        'scalar':   { 'scalar': s.scalar,   'vector': s.invalid, 'matrix': s.invalid, 'anything': s.ignore },
        'vector':   { 'scalar': s.vector,   'vector': s.invalid, 'matrix': s.invalid, 'anything': s.ignore },
        'matrix':   { 'scalar': s.matrix,   'vector': s.invalid, 'matrix': s.invalid, 'anything': s.ignore },
        'anything': { 'scalar': s.anything, 'vector': s.invalid, 'matrix': s.invalid, 'anything': s.ignore },
    };

    static calculate(lhs, rhs) {
        // TODO handle division by 0 here
        if (lhs.type === 'scalar' && rhs.type === 'scalar') {
            return lhs.value / rhs.value;
        } else if (lhs.type === 'vector') {
            const out = vec3.create();
            return vec3.scale(out, lhs.value, 1.0 / rhs.value);
        }
    }
}

class DotOperation extends BaseOperation {
    static title = 'Dot Product';
    static symbol = '·';
    static defaultLhsSocket = 'vector';
    static defaultRhsSocket = 'vector';
    static defaultOutputSocket = 'scalar';

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static calculate(lhs, rhs) {
        return vec3.dot(lhs.value, rhs.value);
    }
}

class CrossOperation extends BaseOperation {
    static title = 'Cross Product';
    static symbol = '×';
    static defaultLhsSocket = 'vector';
    static defaultRhsSocket = 'vector';
    static defaultOutputSocket = 'vector';

    // Socket types are static
    static lhsToRhsTypeMap = null;
    static rhsToLhsTypeMap = null;
    static inputToOutputTypeMap = null;

    static calculate(lhs, rhs) {
        const out = vec3.create();
        return vec3.cross(out, lhs.value, rhs.value);
    }
}

const Operation = Object.freeze({
    ADD:      AddOperation,
    SUBTRACT: SubtractOperation,
    MULTIPLY: MultiplyOperation,
    DIVIDE:   DivideOperation,
    DOT:      DotOperation,
    CROSS:    CrossOperation,
});

export class VectorOperationComponent extends Rete.Component {
    constructor(opName) {
        // Note that the Rete engine does some node lookups by name, so each node type must have a unique name.
        // This is especially important in here where I give the component some state; if the name is shared anywhere it will look up
        //   the wrong worker() function during engine processing
        super(Operation[opName].title);
        this.data.component = NodeRenderer;

        this.opName = opName;
    }

    builder(node) {
        // TODO Maybe change socket types to be defined in terms of "addable", "dottable", etc.
        Operation[this.opName].setupSockets(node);
        return node;
    }

    worker(engineNode, inputs, outputs) {
        const editorNode = this.editor.nodes.find(n => n.id === engineNode.id);

        // console.log(`TEST VectorOperationComponent worker (${editorNode.name})`);
        // console.log(this.editor);
        // console.log(engineNode);
        // console.log(inputs);
        // console.log(outputs);
        // console.log(editorNode);
        // console.log(editorNode.inputs);
        // console.log(editorNode.outputs);

        function getInputTypes(name) {
            // console.log(`TEST getInputTypes ${name}`);
            const input = editorNode.inputs.get(name);
            // console.log(input);
            console.assert(input.connections.length <= 1);
            if (_.isEmpty(input.connections)) {
                return null; // TODO probably better to return empty list?
            } else {
                return getSocketTypes(input.connections[0].output.socket);
            }
        }

        const operation = Operation[this.opName];
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
            console.assert(input.connections.length <= 1);
            if (_.isEmpty(input.connections)) {
                return false;
            }
            const connection = input.connections[0];
            if (connection.input.socket.name !== connection.output.socket.name) {
                // TODO doesn't account for compatible sockets with different names, though I am not using those yet outside of 'Anything' sockets
                // console.log(`TEST socket name mismatch (${connection.input.socket.name} ${connection.output.socket.name}), flagging for update`);
                return true;
            }
        }));

        // const needsUpdate = hasDynamicInputSockets && (anyConnectionEmpty || anySocketTypeMismatch); // TODO dynamic also could just mean that the socket can go from 'anything' to input type
        const needsUpdateFromInputs = anyConnectionEmpty || anySocketTypeMismatch;
        if (needsUpdateFromInputs) {
            // First, update each input socket based on the type connected to it
            const lhsInputTypes = getInputTypes('lhs');
            const rhsInputTypes = getInputTypes('rhs');
            // console.log(`TEST worker updating socket types ${editorNode.name}, ${lhsInputTypes} ${rhsInputTypes}`);
            operation.updateSocketTypesFromInputs(editorNode, lhsInputTypes, rhsInputTypes);
        }

        // Then update "sibling" socket types depending on types accepted for the current operation
        // TODO do a check here like with "needsUpdateFromInputs"?
        let lhsTypes = getSocketTypes(editorNode.inputs.get('lhs').socket);
        let rhsTypes = getSocketTypes(editorNode.inputs.get('rhs').socket);
        // console.log(`TEST type BEFORE updateSocketTypesForOperationCompatibility: LHS ${lhsTypes} RHS ${rhsTypes}`);
        operation.updateSocketTypesForOperationCompatibility(editorNode, lhsTypes, rhsTypes);
        lhsTypes = getSocketTypes(editorNode.inputs.get('lhs').socket); // TODO maybe return [lhs, rhs] from updateSocketTypesForOperationCompatibility
        rhsTypes = getSocketTypes(editorNode.inputs.get('rhs').socket);
        // console.log(`TEST type AFTER updateSocketTypesForOperationCompatibility: LHS ${lhsTypes} RHS ${rhsTypes}`);

        // Finally, update output socket type based on input socket types
        operation.updateOutputSocketTypes(this.editor, editorNode, lhsTypes, rhsTypes);

        function getInputValue(name) { // TODO pull out somewhere common
            // console.log(`getInputValue ${name} inputs:`);
            // console.log(inputs);
            return inputs[name].length ? inputs[name][0] : engineNode.data[name];
        }

        const lhsValue = getInputValue('lhs');
        const rhsValue = getInputValue('rhs');
        if (_.isNil(lhsValue) || _.isNil(rhsValue)) {
            return;
        }

        console.assert(lhsTypes.length === 1, lhsTypes);
        console.assert(rhsTypes.length === 1, rhsTypes);
        const result = operation.calculate({type: lhsTypes[0], value: lhsValue}, {type: rhsTypes[0], value: rhsValue});
        outputs['result'] = result;
    }
};
