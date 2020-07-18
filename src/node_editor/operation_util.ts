import _ from 'lodash';

import { SocketType, CompoundSocketType, sockets } from './sockets';
import * as util from '../util';
import type { NodeEditor } from 'rete/types/editor';
import type { Input } from 'rete/types/input';
import type { IO } from 'rete/types/io';
import type { Output } from 'rete/types/output';
import type { Socket } from 'rete/types/socket';

export type InputSocketCompatibilityMap = { [lhs: string]: Set<SocketType> }
export type UnaryInputToOutputSocketMap = { [input: string]: Set<SocketType> }
export type BinaryInputToOutputSocketMap = { [lhs: string]: { [rhs: string]: Set<SocketType> } }

export const s = Object.freeze({ // TODO better name (though brevity is convenient for compatibility matrices)
    scalar:         new Set([SocketType.SCALAR]),
    vector:         new Set([SocketType.VECTOR]),
    matrix:         new Set([SocketType.MATRIX]),
    scalarOrVector: new Set([SocketType.SCALAR, SocketType.VECTOR]),
    scalarOrMatrix: new Set([SocketType.SCALAR, SocketType.MATRIX]),
    vectorOrMatrix: new Set([SocketType.VECTOR, SocketType.MATRIX]),
    anything:       new Set([SocketType.SCALAR, SocketType.VECTOR, SocketType.MATRIX]),
    invalid:        new Set([SocketType.INVALID]),
    ignore:         new Set([SocketType.IGNORE]),
});

export function socketTypesToCompoundSocket(typeList: Set<SocketType>): CompoundSocketType {
    if (!(typeList instanceof Set)) {
        throw new Error('socketTypesToCompoundSocket: Input should be of type Set');
    }
    switch (true) {
    case _.isEqual(typeList, s.scalar):         return CompoundSocketType.SCALAR;
    case _.isEqual(typeList, s.vector):         return CompoundSocketType.VECTOR;
    case _.isEqual(typeList, s.matrix):         return CompoundSocketType.MATRIX;
    case _.isEqual(typeList, s.scalarOrVector): return CompoundSocketType.SCALAR_OR_VECTOR;
    case _.isEqual(typeList, s.scalarOrMatrix): return CompoundSocketType.SCALAR_OR_MATRIX;
    case _.isEqual(typeList, s.vectorOrMatrix): return CompoundSocketType.VECTOR_OR_MATRIX;
    case _.isEqual(typeList, s.anything):       return CompoundSocketType.ANYTHING;
    default: throw new Error(`Could not determine socket name from list "${Array.from(typeList).join(',')}"`);
    }
}

// TODO There should be a way to avoid this...
export function getSocketTypes(socket: Socket): Set<SocketType> {
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

export function updateIoType(io: IO, socketTypes: Set<SocketType>): void {
    // console.log('TEST updateIoType ', io.node.name, io.name, 'to', socketTypes, typeof socketTypes);
    const compoundSocket = socketTypesToCompoundSocket(socketTypes);
    const newSocket = sockets[compoundSocket];
    if (_.isNil(newSocket)) {
        throw new Error(`Could not find socket named ${compoundSocket}`);
    }
    io.socket = newSocket;
    // console.log('TEST new io:');
    // console.log(io);

    if (io.node == null) {
        throw new Error(`IO node was null: ${io}`);
    }
    io.node.update(); // TODO may want to pull this out to worker() to only do once for performance
    // console.log('TEST updateIoType END');
}

export function getInputTypes(input: Input): Set<SocketType> | null {
    // console.log(input);
    console.assert(input.connections.length <= 1);
    if (_.isEmpty(input.connections)) {
        return null; // TODO probably better to return empty list?
    } else {
        return getSocketTypes(input.connections[0].output.socket);
    }
}

export function getNewSocketTypesFromInput(
    typesFromInputConnection: Set<SocketType> | null,
    typesFromInputSocket: Set<SocketType>,
    defaultTypes: Set<SocketType>,
): Set<SocketType> {
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

export function getNewSocketTypeForOperationCompatibility(
    socketTypes: Set<SocketType>,
    oppositeSocketTypes: Set<SocketType>,
    oppositeTypeToThisTypeMap: InputSocketCompatibilityMap,
): Set<SocketType> {
    const compatibleTypes = new Set<SocketType>();
    for (const oppositeSocketType of oppositeSocketTypes) {
        // TODO this doesn't feel quite right... like it might choose socket types that are "too loose"
        // TODO maybe I need to explicitly list type mappings for hybrid types instead of auto-aggregating here
        if (oppositeTypeToThisTypeMap[oppositeSocketType]) {
            for (const otherSideCompatibleType of oppositeTypeToThisTypeMap[oppositeSocketType]) {
                compatibleTypes.add(otherSideCompatibleType);
            }
        }
    }

    if (!_.isEmpty(compatibleTypes)) {
        if (util.isSubset(socketTypes, compatibleTypes)) {
            return socketTypes;
        } else {
            return compatibleTypes;
        }
    } else {
        throw new Error(`Could not determine compatible types between ${[...socketTypes].join(',')} and ${[...oppositeSocketTypes].join(',')}`);
    }
}

export function removeInputConnectionsIfIncompatible(editor: NodeEditor, input: Input): void {
    _removeIoConnectionsIfIncompatible(editor, input, true);
}

export function removeOutputConnectionsIfIncompatible(editor: NodeEditor, output: Output): void {
    _removeIoConnectionsIfIncompatible(editor, output, false);
}

function _removeIoConnectionsIfIncompatible(editor: NodeEditor, io: IO, isInput: boolean): void {
    const socketTypes = getSocketTypes(io.socket);
    for (const connection of io.connections) {
        const typesFromInput = getSocketTypes(isInput ? connection.output.socket : connection.input.socket);
        if (!util.intersects(socketTypes, typesFromInput)) {
            editor.removeConnection(connection);
        }
    }
}

export default {
    SocketType,
    CompoundSocketType,
    s,
    socketTypesToCompoundSocket,
    getSocketTypes,
    updateIoType,
    getInputTypes,
    getNewSocketTypesFromInput,
    getNewSocketTypeForOperationCompatibility,
    removeInputConnectionsIfIncompatible,
    removeOutputConnectionsIfIncompatible,
};
