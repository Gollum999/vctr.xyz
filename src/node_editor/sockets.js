import Rete from 'rete';

const sockets = {
    scalar: new Rete.Socket('Scalar value'),
    vector: new Rete.Socket('Vector value'),
};

// These are displayed when hovering over a socket of each type
sockets.scalar.hint = '';
sockets.vector.hint = '';

export default sockets;
