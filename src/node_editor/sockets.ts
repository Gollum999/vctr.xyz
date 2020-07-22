import Rete from 'rete';

export enum SocketType {
    SCALAR = 'scalar',
    VECTOR = 'vector',
    MATRIX = 'matrix',
    INVALID = 'INVALID', // Sentinel indicating that the specified combination should never happen (raise an error if it does)
    IGNORE = 'IGNORE', // Sentinel indicating that no changes need to be made
}

export enum CompoundSocketType {
    SCALAR = 'scalar',
    VECTOR = 'vector',
    MATRIX = 'matrix',
    SCALAR_OR_VECTOR = 'scalarOrVector',
    SCALAR_OR_MATRIX = 'scalarOrMatrix',
    VECTOR_OR_MATRIX = 'vectorOrMatrix',
    ANYTHING = 'anything',
}

export const sockets = Object.freeze({
    [CompoundSocketType.SCALAR]: new Rete.Socket('Scalar value'),
    [CompoundSocketType.VECTOR]: new Rete.Socket('Vector value'),
    [CompoundSocketType.MATRIX]: new Rete.Socket('Matrix value'),

    [CompoundSocketType.SCALAR_OR_VECTOR]: new Rete.Socket('Scalar or Vector'),
    [CompoundSocketType.SCALAR_OR_MATRIX]: new Rete.Socket('Scalar or Matrix'),
    [CompoundSocketType.VECTOR_OR_MATRIX]: new Rete.Socket('Vector or Matrix'),

    [CompoundSocketType.ANYTHING]: new Rete.Socket('Anything'),
});

export const compoundSocket = Object.freeze({
    SCALAR:           new Set([SocketType.SCALAR]),
    VECTOR:           new Set([SocketType.VECTOR]),
    MATRIX:           new Set([SocketType.MATRIX]),
    SCALAR_OR_VECTOR: new Set([SocketType.SCALAR, SocketType.VECTOR]),
    SCALAR_OR_MATRIX: new Set([SocketType.SCALAR, SocketType.MATRIX]),
    VECTOR_OR_MATRIX: new Set([SocketType.VECTOR, SocketType.MATRIX]),
    ANYTHING:         new Set([SocketType.SCALAR, SocketType.VECTOR, SocketType.MATRIX]),
    INVALID:          new Set([SocketType.INVALID]),
    IGNORE:           new Set([SocketType.IGNORE]),
});

// These are displayed when hovering over a socket of each type
// TODO This doesn't work anymore; package update might have broken it (but I don't care enough to try to fix it)
(sockets.scalar as any).hint = '';
(sockets.vector as any).hint = '';
(sockets.matrix as any).hint = '';
(sockets.scalarOrVector as any).hint = 'Connection types will be determined after an input has been connected';
(sockets.scalarOrMatrix as any).hint = 'Connection types will be determined after an input has been connected';
(sockets.vectorOrMatrix as any).hint = 'Connection types will be determined after an input has been connected';
(sockets.anything as any).hint = 'Connection types will be determined after an input has been connected';

// Define how socket types are allowed to interact
sockets.scalar.combineWith(sockets.scalarOrVector);
sockets.vector.combineWith(sockets.scalarOrVector);
sockets.scalarOrVector.combineWith(sockets.scalar);
sockets.scalarOrVector.combineWith(sockets.vector);

sockets.scalar.combineWith(sockets.scalarOrMatrix);
sockets.matrix.combineWith(sockets.scalarOrMatrix);
sockets.scalarOrMatrix.combineWith(sockets.scalar);
sockets.scalarOrMatrix.combineWith(sockets.matrix);

sockets.vector.combineWith(sockets.vectorOrMatrix);
sockets.matrix.combineWith(sockets.vectorOrMatrix);
sockets.vectorOrMatrix.combineWith(sockets.vector);
sockets.vectorOrMatrix.combineWith(sockets.matrix);

sockets.scalar.combineWith(sockets.anything);
sockets.vector.combineWith(sockets.anything);
sockets.matrix.combineWith(sockets.anything);
sockets.anything.combineWith(sockets.scalar);
sockets.anything.combineWith(sockets.vector);
sockets.anything.combineWith(sockets.matrix);

export default sockets;
