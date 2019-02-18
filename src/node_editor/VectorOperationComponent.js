import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { vec3 } from 'gl-matrix';

const Operation = Object.freeze({
    ADD:      { title: 'Add',           symbol: '+' },
    SUBTRACT: { title: 'Subtract',      symbol: '-' },
    MULTIPLY: { title: 'Multiply',      symbol: '*' },
    DIVIDE:   { title: 'Divide',        symbol: '/' },
    DOT:      { title: 'Dot Product',   symbol: '·' },
    CROSS:    { title: 'Cross Product', symbol: '×' },
});

function getOpFunction(operation) {
    switch (operation) {
    case 'ADD': return (lhs, rhs) => {
        // TODO behavior needs to change based on input types
        const out = vec3.create();
        return vec3.add(out, lhs, rhs);
    };
    case 'SUBTRACT': return (lhs, rhs) => {
        const out = vec3.create();
        return vec3.subtract(out, lhs, rhs);
    };
    case 'MULTIPLY': return (lhs, rhs) => {
        return lhs * rhs;
    };
    case 'DIVIDE': return (lhs, rhs) => {
        return lhs / rhs;
    };
    case 'DOT': return (lhs, rhs) => {
        // TODO output socket needs to change based on operation
        return vec3.dot(lhs, rhs);
    };
    case 'CROSS': return (lhs, rhs) => {
        const out = vec3.create();
        return vec3.cross(out, lhs, rhs);
    };
    default:
        throw new Error(`Invalid operation "${operation}" selected in VectorOperationComponent node`);
    }
}

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
        // TODO Make a socket type that can accept anything "addable", "dottable", etc.
        // TODO Change other accepted node type after the first connection is made
        // TODO   Is that the right way to handle this?  Otherwise I would probably need different node types for every combination of inputs
        node.addInput(new Rete.Input('lhs', 'A', sockets.anything));
        node.addInput(new Rete.Input('rhs', 'B', sockets.anything));

        const outputName = `A ${Operation[this.opName].symbol} B`;
        node.addOutput(new Rete.Output('result', outputName, sockets.anything));
        return node;
    }

    worker(node, inputs, outputs) {
        function getInput(name) { // TODO assumes only one input per socket
            console.log(`getInput inputs:`);
            console.log(inputs);
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const vec1 = getInput('lhs');
        const vec2 = getInput('rhs');
        if (_.isNil(vec1) || _.isNil(vec2)) {
            return;
        }

        const opFn = getOpFunction(this.opName);
        const result = opFn(vec1, vec2);
        outputs['result'] = result;
    }
};
