import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { vec3 } from 'gl-matrix';

class BaseOperation {
    static title = null;
    static symbol = null;

    static getOutputName() {
        return `A ${this.symbol} B`;
    }

    static setupSockets(node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets.anything));
        node.addInput(new Rete.Input('rhs', 'B', sockets.anything));
        node.addOutput(new Rete.Output('result', this.getOutputName(), sockets.anything));
    }
}

class AddOperation extends BaseOperation {
    static title = 'Add';
    static symbol = '+';

    static calculate(lhs, rhs) {
        // TODO behavior needs to change based on input types
        const out = vec3.create();
        return vec3.add(out, lhs.value, rhs.value);
    }

    static updateInputs(editorNode, lhsType, rhsType) {
        const inputType = lhsType || rhsType;
        console.log(`ADD updating all connections to input type ${inputType}`);
        updateIoType(editorNode.inputs.get('lhs'), inputType);
        updateIoType(editorNode.inputs.get('rhs'), inputType);
        updateIoType(editorNode.outputs.get('result'), inputType);
    }
}

class SubtractOperation extends BaseOperation {
    static title = 'Subtract';
    static symbol = '-';

    static calculate(lhs, rhs) {
        // TODO behavior needs to change based on input types
        const out = vec3.create();
        return vec3.subtract(out, lhs.value, rhs.value);
    }

    static updateInputs(editorNode, lhsType, rhsType) {
        const inputType = lhsType || rhsType;
        console.log(`SUBTRACT updating all connections to input type ${inputType}`);
        updateIoType(editorNode.inputs.get('lhs'), inputType);
        updateIoType(editorNode.inputs.get('rhs'), inputType);
        updateIoType(editorNode.outputs.get('result'), inputType);
    }
}

class MultiplyOperation extends BaseOperation {
    static title = 'Multiply';
    static symbol = '*';

    static calculate(lhs, rhs) {
        if (lhs.type === sockets.scalar && rhs.type === sockets.scalar) {
            return lhs.value * rhs.value;
        } else if (lhs.type === sockets.vector) {
            const out = vec3.create();
            return vec3.scale(out, lhs.value, rhs.value);
        } else if (rhs.type === sockets.vector) {
            const out = vec3.create();
            return vec3.scale(out, rhs.value, lhs.value);
        }
    }

    static updateInputs(editorNode, lhsType, rhsType) {
        console.log(`MULTIPLY updating all connections`);
        // TODO seems like bitmasks are probably the way to go here?
        updateIoType(editorNode.inputs.get('lhs'), lhsType || sockets.anything);
        updateIoType(editorNode.inputs.get('rhs'), rhsType || sockets.anything);
        if (lhsType === sockets.scalar) {
            if (rhsType === null) {
                // updateIoType(editorNode.inputs.get('rhs'), sockets.vectorOrScalar); // TODO support this
                // updateIoType(editorNode.outputs.get('result'), sockets.vectorOrScalar); // TODO support this
                updateIoType(editorNode.inputs.get('rhs'), sockets.anything);
                updateIoType(editorNode.outputs.get('result'), sockets.anything);
            } else if (rhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.scalar);
            } else if (rhsType === sockets.vector) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        } else if (rhsType === sockets.scalar) { // TODO clean way to handle this mirroring?
            if (lhsType === null) {
                // updateIoType(editorNode.inputs.get('lhs'), sockets.vectorOrScalar); // TODO support this
                // updateIoType(editorNode.outputs.get('result'), sockets.vectorOrScalar); // TODO support this
                updateIoType(editorNode.inputs.get('lhs'), sockets.anything);
                updateIoType(editorNode.outputs.get('result'), sockets.anything);
            } else if (lhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.scalar);
            } else if (lhsType === sockets.vector) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        } else if (lhsType === sockets.vector) {
            if (rhsType === null) {
                updateIoType(editorNode.inputs.get('rhs'), sockets.scalar);
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            } else if (rhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        } else if (rhsType === sockets.vector) { // TODO clean way to handle this mirroring?
            if (lhsType === null) {
                updateIoType(editorNode.inputs.get('lhs'), sockets.scalar);
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            } else if (lhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        }
    }
}

class DivideOperation extends BaseOperation {
    static title = 'Divide';
    static symbol = '/';

    static calculate(lhs, rhs) {
        if (lhs.type === sockets.scalar && rhs.type === sockets.scalar) {
            return lhs.value / rhs.value;
        } else if (lhs.type === sockets.vector) {
            const out = vec3.create();
            return vec3.scale(out, lhs.value, 1.0 / rhs.value);
        } else if (rhs.type === sockets.vector) {
            const out = vec3.create();
            return vec3.scale(out, rhs.value, 1.0 / lhs.value); // TODO this is wrong, division is not commutative...
        }
    }

    static updateInputs(editorNode, lhsType, rhsType) {
        console.log(`DIVIDE updating all connections`);
        // TODO seems like bitmasks are probably the way to go here?
        updateIoType(editorNode.inputs.get('lhs'), lhsType || sockets.anything);
        updateIoType(editorNode.inputs.get('rhs'), rhsType || sockets.anything);
        if (lhsType === sockets.scalar) {
            if (rhsType === null) {
                // updateIoType(editorNode.inputs.get('rhs'), sockets.vectorOrScalar); // TODO support this
                // updateIoType(editorNode.outputs.get('result'), sockets.vectorOrScalar); // TODO support this
                updateIoType(editorNode.inputs.get('rhs'), sockets.anything);
                updateIoType(editorNode.outputs.get('result'), sockets.anything);
            } else if (rhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.scalar);
            } else if (rhsType === sockets.vector) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        } else if (rhsType === sockets.scalar) { // TODO clean way to handle this mirroring?
            if (lhsType === null) {
                // updateIoType(editorNode.inputs.get('lhs'), sockets.vectorOrScalar); // TODO support this
                // updateIoType(editorNode.outputs.get('result'), sockets.vectorOrScalar); // TODO support this
                updateIoType(editorNode.inputs.get('lhs'), sockets.anything);
                updateIoType(editorNode.outputs.get('result'), sockets.anything);
            } else if (lhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.scalar);
            } else if (lhsType === sockets.vector) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        } else if (lhsType === sockets.vector) {
            if (rhsType === null) {
                updateIoType(editorNode.inputs.get('rhs'), sockets.scalar);
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            } else if (rhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        } else if (rhsType === sockets.vector) { // TODO clean way to handle this mirroring?
            if (lhsType === null) {
                updateIoType(editorNode.inputs.get('lhs'), sockets.scalar);
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            } else if (lhsType === sockets.scalar) {
                updateIoType(editorNode.outputs.get('result'), sockets.vector);
            }
        }
    }
}

class DotOperation extends BaseOperation {
    static title = 'Dot Product';
    static symbol = '·';

    static setupSockets(node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets.vector));
        node.addInput(new Rete.Input('rhs', 'B', sockets.vector));
        node.addOutput(new Rete.Output('result', DotOperation.getOutputName(), sockets.scalar));
    }

    static calculate(lhs, rhs) {
        return vec3.dot(lhs.value, rhs.value);
    }

    static updateInputs(editorNode, lhsType, rhsType) {
        // Socket types are static
    }
}

class CrossOperation extends BaseOperation {
    static title = 'Cross Product';
    static symbol = '×';

    static setupSockets(node) {
        node.addInput(new Rete.Input('lhs', 'A', sockets.vector));
        node.addInput(new Rete.Input('rhs', 'B', sockets.vector));
        node.addOutput(new Rete.Output('result', CrossOperation.getOutputName(), sockets.vector));
    }

    static calculate(lhs, rhs) {
        const out = vec3.create();
        return vec3.cross(out, lhs.value, rhs.value);
    }

    static updateInputs(editorNode, lhsType, rhsType) {
        // Socket types are static
    }
}

const Operation = Object.freeze({
    ADD:      AddOperation,
    SUBTRACT: SubtractOperation,
    MULTIPLY: MultiplyOperation,
    DIVIDE:   DivideOperation,
    DOT:      DotOperation,
    CROSS:    CrossOperation,
});

function getSocketType(socket) {
    switch (socket.name) {
    case 'Anything':     return sockets.anything;
    case 'Scalar value': return sockets.scalar;
    case 'Vector value': return sockets.vector;
    case 'Matrix value': return sockets.matrix;
    default: throw new Error(`Could not find socket type for name "${socket.name}"`);
    }
}

function updateIoType(io, socket) {
    // TODO something like...:
    // console.log(`TEST updateIoType "${io.node.name}" "${io.key}" "${io.name}" "${socket.name}"`);
    // console.log(io);
    io.socket = getSocketType(socket);
    // console.log('TEST new io:');
    // console.log(io);
    // TODO if connected to wrong type, kill connection

    // TODO how much am I breaking by changing socket type like this?  need to reestablish connections or anything?
    // TODO what if 'anything' already connected to incompatible type, what will happen when socket type changes?
    //      (probably need to reset connection manually)
    io.node.update();
    // console.log('TEST updateIoType END');
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
        Operation[this.opName].setupSockets(node);
        return node;
    }

    worker(engineNode, inputs, outputs) {
        const editorNode = this.editor.nodes.find(n => n.id === engineNode.id);

        // console.log('TEST VectorOperationComponent worker');
        // console.log(engineNode);
        // console.log(inputs);
        // console.log(outputs);
        // console.log(editorNode);
        // console.log(editorNode.inputs);
        // console.log(editorNode.outputs);

        function getInputType(name) {
            // console.log(`TEST getInputType ${name}`);
            const input = editorNode.inputs.get(name);
            // console.log(input);
            for (const connection of input.connections) { // TODO not sure if this loop makes sense since on input side since it should always be either 0
                if (getSocketType(connection.output.socket) !== sockets.anything) {
                    // There is a connection with a concrete type that we can start propogating down the chain
                    // console.log('TEST Found connection with types that can be passed down');
                    // console.log(connection);
                    // console.log(`TEST Using ${connection.output.socket.name}`);

                    return getSocketType(connection.output.socket);
                }
            }
            return null;
        }

        const inputArray = Array.from(editorNode.inputs);
        var needsUpdate = (inputArray.every((name, input) => {
            const connectionsEmpty = (!input.connections || !input.connections.length);
            if (connectionsEmpty) {
                console.log('TEST all connections empty, flagging for update');
            }
            return connectionsEmpty;
        }));
        for (const input of editorNode.inputs.values()) {
            for (const connection of input.connections) { // TODO not sure if this loop makes sense since on input side since it should always be either 0
                if (connection.input.socket.name !== connection.output.socket.name) {
                    // TODO doesn't account for compatible sockets with different names, though I am not using those yet outside of 'Anything' sockets
                    console.log('TEST socket name mismatch, flagging for update');
                    needsUpdate = true;
                }
            }
        }

        const lhsType = getInputType('lhs');
        const rhsType = getInputType('rhs');

        if (needsUpdate) {
            // console.log('TEST needs update');
            // console.log(lhsType);
            // console.log(rhsType);
            if (lhsType || rhsType) {
                Operation[this.opName].updateInputs(editorNode, lhsType, rhsType);
            } else {
                console.log('TEST resetting connections to "Anything"');
                updateIoType(editorNode.inputs.get('lhs'), sockets.anything);
                updateIoType(editorNode.inputs.get('rhs'), sockets.anything);
                updateIoType(editorNode.outputs.get('result'), sockets.anything);
            }
        }

        function getInputValue(name) { // TODO assumes only one input per socket
            // console.log(`getInputValue inputs:`);
            // console.log(inputs);
            return inputs[name].length ? inputs[name][0] : engineNode.data[name];
        }

        const lhsValue = getInputValue('lhs');
        const rhsValue = getInputValue('rhs');
        if (_.isNil(lhsValue) || _.isNil(rhsValue)) {
            return;
        }

        const result = Operation[this.opName].calculate({type: lhsType, value: lhsValue}, {type: rhsType, value: rhsValue});
        outputs['result'] = result;
    }
};
