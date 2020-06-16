import _ from 'lodash';

import sockets from './sockets';
import * as util from '../util';

export const invalid = 'INVALID'; // Sentinel indicating that the specified combination should never happen (raise an error if it does)
export const ignore = 'IGNORE'; // Sentinel indicating that no changes need to be made
export const s = Object.freeze({ // TODO better name (though brevity is convenient for compatibility matrices)
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

export function socketTypeListToSocketName(typeList) {
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
export function getSocketTypes(socket) {
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

export function updateIoType(io, socketTypeNameOrList) {
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

export function getInputTypes(input) {
    // console.log(input);
    console.assert(input.connections.length <= 1);
    if (_.isEmpty(input.connections)) {
        return null; // TODO probably better to return empty list?
    } else {
        return getSocketTypes(input.connections[0].output.socket);
    }
}

export function getNewSocketTypesFromInput(typesFromInputConnection, typesFromInputSocket, defaultTypes) {
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

export function getNewSocketTypeForOperationCompatibility(socketTypes, oppositeSocketTypes, oppositeTypeToThisTypeMap) {
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

export function removeInputConnectionsIfIncompatible(editor, input) {
    _removeIoConnectionsIfIncompatible(editor, input, true);
}

export function removeOutputConnectionsIfIncompatible(editor, output) {
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

export default {
    invalid,
    ignore,
    s,
    socketTypeListToSocketName,
    getSocketTypes,
    updateIoType,
    getInputTypes,
    getNewSocketTypesFromInput,
    getNewSocketTypeForOperationCompatibility,
    removeInputConnectionsIfIncompatible,
    removeOutputConnectionsIfIncompatible,
};
