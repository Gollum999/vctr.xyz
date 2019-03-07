import Rete from 'rete';

const sockets = {
    scalar: new Rete.Socket('Scalar value'),
    vector: new Rete.Socket('Vector value'),
    matrix: new Rete.Socket('Matrix value'),

    // TODO is there a cleaner way to do this?  If I ever need more value types, this is not extensible
    scalarOrVector: new Rete.Socket('Scalar or Vector'),
    scalarOrMatrix: new Rete.Socket('Scalar or Matrix'),
    vectorOrMatrix: new Rete.Socket('Vector or Matrix'),

    anything: new Rete.Socket('Anything'),
};

// These are displayed when hovering over a socket of each type
sockets.scalar.hint = '';
sockets.vector.hint = '';
sockets.matrix.hint = '';
sockets.scalarOrVector.hint = 'Connection types will be determined after an input has been connected';
sockets.scalarOrMatrix.hint = 'Connection types will be determined after an input has been connected';
sockets.vectorOrMatrix.hint = 'Connection types will be determined after an input has been connected';
sockets.anything.hint = 'Connection types will be determined after an input has been connected';

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

// TODO might make sense to make this unidirectional, so I don't have to remove connections from dynamic outputs if the types become incompatible
sockets.scalar.combineWith(sockets.anything);
sockets.vector.combineWith(sockets.anything);
sockets.matrix.combineWith(sockets.anything);
sockets.anything.combineWith(sockets.scalar);
sockets.anything.combineWith(sockets.vector);
sockets.anything.combineWith(sockets.matrix);

export default sockets;
