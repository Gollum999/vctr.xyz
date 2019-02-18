import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { vec3 } from 'gl-matrix';
import { VectorOperationControl } from './VectorOperationControl';

export class VectorOperationComponent extends Rete.Component {
    constructor() {
        super('Vector Operation');
        this.data.component = NodeRenderer;
    }

    builder(node) {
        node.addInput(new Rete.Input('vector1', 'Left', sockets.vector));
        node.addInput(new Rete.Input('vector2', 'Right', sockets.vector));
        node.addOutput(new Rete.Output('vector', 'Result', sockets.vector));
        node.addControl(new VectorOperationControl(this.editor, 'value'));
        return node;
    }

    worker(node, inputs, outputs) {
        const thisNode = this.editor.nodes.find(n => n.id === node.id);
        const opFn = (() => {
            switch (thisNode.controls.get('value').getValue()) {
            case 'Add':
                return vec3.add;
            case 'Subtract':
                return vec3.subtract;
            case 'Dot':
                return vec3.dot; // TODO output sockets change
            case 'Cross':
                return vec3.cross;
            default:
                throw new Error(`Invalid operation "${thisNode.controls.get('value').getValue()}" selected in VectorOperationComponent node (id ${node.id})`);
            }
        })();

        function getInput(name) { // TODO assumes only one input per socket
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const vec1 = getInput('vector1');
        const vec2 = getInput('vector2');
        if (_.isNil(vec1) || _.isNil(vec2)) {
            return;
        }
        const out = vec3.create();
        opFn(out, vec1, vec2); // TODO assign?

        outputs['vector'] = out;
    }
};
