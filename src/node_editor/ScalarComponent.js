import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ScalarControl } from './ScalarControl.js';

export class ScalarComponent extends Rete.Component {
    constructor() {
        super('Scalar');
        this.data.component = NodeRenderer;
        console.log('ScalarComponent constructor');
    }

    builder(node) {
        console.log('ScalarComponent builder');
        let out = new Rete.Output('num', 'Number', sockets.scalar);
        let control = new ScalarControl(this.editor, 'numctl');
        node.addControl(control);
        node.addOutput(out);
        return node;
    }

    worker(node, inputs, outputs) {
        console.log(`ScalarComponent worker setting output to ${node.data.numctl} (${typeof node.data.numctl})`);
        console.log(node.data);
        outputs['num'] = node.data.numctl;
    }
}
