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

    worker(engineNode, inputs, outputs) {
        const editorNode = this.editor.nodes.find(n => n.id === engineNode.id);

        console.log('TEST VectorOperationComponent');
        console.log(engineNode);
        console.log(inputs);
        console.log(outputs);
        console.log(editorNode);
        console.log(editorNode.inputs);
        console.log(editorNode.outputs);

        const updateIoType = (io, name) => {
            // TODO something like...:
            console.log(`TEST updateIoType ${name}`);
            console.log(io);
            switch (name) {
            case 'Anything': // TODO this is pretty clunky, maybe can just use type?
                io.socket = sockets.anything;
                break;
            case 'Scalar value':
                io.socket = sockets.scalar;
                break;
            case 'Vector value':
                io.socket = sockets.vector;
                break;
            case 'Matrix value':
                io.socket = sockets.matrix;
                break;
            default:
                throw new Error(`Could not update "Anything" socket to new type "${name}"`);
            }
            console.log('TEST new io:');
            console.log(io);

            // TODO how much am I breaking by changing socket type like this?  need to reestablish connections or anything?
            // TODO what if 'anything' already connected to incompatible type, what will happen when socket type changes?
            //      (probably need to reset connection manually)
            console.log('TEST forcing re-render...');
            io.node.update();
        };

        // TODO this can probably be cleaned up...
        var inputType = null;
        var needsUpdate = false;
        for (const [name, input] of editorNode.inputs) {
            console.log(`TEST updateIoType ${name}`);
            console.log(input);
            for (const connection of input.connections) { // TODO not sure if this loop makes sense since on input side since it should always be either 0
                if (connection.output.socket.name !== 'Anything') {
                    // There is a connection with a concrete type that we can start propogating down the chain
                    console.log('TEST Found connection with types that can be passed down');
                    console.log(connection);
                    console.log(`TEST Using ${connection.output.socket.name}`);

                    inputType = connection.output.socket.name;
                }
                if (connection.input.socket.name !== connection.output.socket.name) {
                    // TODO doesn't account for compatible sockets with different names, though I am not using those yet outside of 'Anything' sockets
                    needsUpdate = true;
                }
            }
        }
        if (Array.from(editorNode.inputs).every((name, input) => {
            return !input.connections || !input.connections.length;
        })) {
            console.log('TEST all connections empty, flagging for update');
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log('TEST needs update');
            if (inputType) {
                console.log(`TEST updating all connections to input type ${inputType}`);
                // TODO assumes all inputs and outputs must be same type; will probably need to change depending on operation type
                updateIoType(editorNode.inputs.get('lhs'), inputType);
                updateIoType(editorNode.inputs.get('rhs'), inputType);
                updateIoType(editorNode.outputs.get('result'), inputType);
            } else {
                console.log('TEST resetting connections to "Anything"');
                updateIoType(editorNode.inputs.get('lhs'), 'Anything');
                updateIoType(editorNode.inputs.get('rhs'), 'Anything');
                updateIoType(editorNode.outputs.get('result'), 'Anything');
            }
        }

        function getInput(name) { // TODO assumes only one input per socket
            console.log(`getInput inputs:`);
            console.log(inputs);
            return inputs[name].length ? inputs[name][0] : engineNode.data[name];
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
