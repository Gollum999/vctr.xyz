import Rete from 'rete';

export default {
    scalar: new Rete.Socket('Scalar value'),
    vector: new Rete.Socket('Vector value'),
};
