import _ from 'lodash';

import { SocketType, CompoundSocketType, sockets, compoundSocket } from './sockets';
import * as util from '../util';
import type { NodeEditor } from 'rete/types/editor';
import type { Input } from 'rete/types/input';
import type { IO } from 'rete/types/io';
import type { Output } from 'rete/types/output';
import type { Socket } from 'rete/types/socket';

export type InputSocketCompatibilityMap = { [lhs: string]: Set<SocketType> }
export type UnaryInputToOutputSocketMap = { [input: string]: Set<SocketType> }
export type BinaryInputToOutputSocketMap = { [lhs: string]: { [rhs: string]: Set<SocketType> } }

export function socketTypesToCompoundSocket(typeList: Set<SocketType>): CompoundSocketType {
    if (!(typeList instanceof Set)) {
        throw new Error('socketTypesToCompoundSocket: Input should be of type Set');
    }
    switch (true) {
    case _.isEqual(typeList, compoundSocket.SCALAR):           return CompoundSocketType.SCALAR;
    case _.isEqual(typeList, compoundSocket.VECTOR):           return CompoundSocketType.VECTOR;
    case _.isEqual(typeList, compoundSocket.MATRIX):           return CompoundSocketType.MATRIX;
    case _.isEqual(typeList, compoundSocket.SCALAR_OR_VECTOR): return CompoundSocketType.SCALAR_OR_VECTOR;
    case _.isEqual(typeList, compoundSocket.SCALAR_OR_MATRIX): return CompoundSocketType.SCALAR_OR_MATRIX;
    case _.isEqual(typeList, compoundSocket.VECTOR_OR_MATRIX): return CompoundSocketType.VECTOR_OR_MATRIX;
    case _.isEqual(typeList, compoundSocket.ANYTHING):         return CompoundSocketType.ANYTHING;
    default: throw new Error(`Could not determine socket name from list "${Array.from(typeList).join(',')}"`);
    }
}

// TODO There should be a way to avoid this...
export function getSocketTypes(socket: Socket): Set<SocketType> {
    switch (socket.name) {
    case 'Scalar value':     return compoundSocket.SCALAR;
    case 'Vector value':     return compoundSocket.VECTOR;
    case 'Matrix value':     return compoundSocket.MATRIX;
    case 'Scalar or Vector': return compoundSocket.SCALAR_OR_VECTOR;
    case 'Scalar or Matrix': return compoundSocket.SCALAR_OR_MATRIX;
    case 'Vector or Matrix': return compoundSocket.VECTOR_OR_MATRIX;
    case 'Anything':         return compoundSocket.ANYTHING;
    default: throw new Error(`Could not find socket type for name "${socket.name}"`);
    }
}

export function updateIoType(io: IO, socketTypes: Set<SocketType>): void {
    const compoundSocket = socketTypesToCompoundSocket(socketTypes);
    const newSocket = sockets[compoundSocket];
    if (_.isNil(newSocket)) {
        throw new Error(`Could not find socket named ${compoundSocket}`);
    }
    io.socket = newSocket;

    if (io.node == null) {
        throw new Error(`IO node was null: ${io}`);
    }
    io.node.update(); // TODO may want to pull this out to worker() to only do once for performance
}

export function getInputTypes(input: Input): Set<SocketType> | null {
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
    if (_.isNil(typesFromInputConnection)) { // TODO allowing this to be null is a bit annoying
        return defaultTypes;
    } else if (!_.isEqual(typesFromInputConnection, typesFromInputSocket)) {
        const newTypes = util.intersection(typesFromInputConnection, defaultTypes);
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
    socketTypesToCompoundSocket,
    getSocketTypes,
    updateIoType,
    getInputTypes,
    getNewSocketTypesFromInput,
    getNewSocketTypeForOperationCompatibility,
    removeInputConnectionsIfIncompatible,
    removeOutputConnectionsIfIncompatible,
};
