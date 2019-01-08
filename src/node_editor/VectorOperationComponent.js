import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { vec3 } from 'gl-matrix';
import { VectorOperationControl } from './VectorOperationControl';

export class VectorOperationComponent extends Rete.Component {
    constructor() {
        super('Vector Operation');
        this.data.component = NodeRenderer;
        console.log('VectorOperationComponent constructor');
    }

    builder(node) {
        console.log('VectorOperationComponent builder');
        let in1 = new Rete.Input('vec1', 'Left', sockets.vector);
        let in2 = new Rete.Input('vec2', 'Right', sockets.vector);
        let out = new Rete.Output('vec', 'Result', sockets.vector);
        let control = new VectorOperationControl(this.editor, 'vecctl');
        node.addInput(in1);
        node.addInput(in2);
        node.addOutput(out);
        node.addControl(control);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log('VectorOperationComponent worker');
        // console.log(inputs);
        // console.log(outputs);
        // console.log(node.inputs);
        // console.log(node.outputs);
        const thisNode = this.editor.nodes.find(n => n.id === node.id);
        const opFn = (() => {
            console.log('VectorOperationComponent worker');
            // console.log(thisNode);
            // console.log(thisNode.controls);
            // console.log(thisNode.controls.get('vecctl').getValue);
            // console.log(thisNode.controls.get('vecctl').getValue());
            switch (thisNode.controls.get('vecctl').getValue()) {
            case 'Add':
                return vec3.add;
            case 'Subtract':
                return vec3.subtract;
            case 'Dot':
                return vec3.dot; // TODO output sockets change
            case 'Cross':
                return vec3.cross;
            default:
                throw new Error(`Invalid operation "${thisNode.controls.get('vecctl').getValue()}" selected in VectorOperationComponent node (id ${node.id})`);
            }
        })();
        console.log(`VectorOperationComponent using op: ${opFn}`);

        function getInput(name) { // TODO assumes only one input per socket
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const vec1 = getInput('vec1');
        const vec2 = getInput('vec2');
        const out = vec3.create();
        opFn(out, vec1, vec2); // TODO assign?
        console.log(out);

        outputs['vec'] = out;
    }
};
