import Rete from 'rete';

const sockets = {
    scalar:   new Rete.Socket('Scalar value'),
    vector:   new Rete.Socket('Vector value'),
    matrix:   new Rete.Socket('Matrix value'),
    anything: new Rete.Socket('Anything'),
};

// These are displayed when hovering over a socket of each type
sockets.scalar.hint = '';
sockets.vector.hint = '';
sockets.matrix.hint = '';
sockets.anything.hint = 'Connection types will be determined after an input has been connected';

sockets.scalar.combineWith(sockets.anything);
sockets.vector.combineWith(sockets.anything);
sockets.matrix.combineWith(sockets.anything);
sockets.anything.combineWith(sockets.scalar);
sockets.anything.combineWith(sockets.vector);
sockets.anything.combineWith(sockets.matrix);

export default sockets;
