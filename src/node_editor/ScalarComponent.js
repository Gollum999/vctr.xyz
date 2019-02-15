import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ScalarControl } from './ScalarControl.js';

export class ScalarComponent extends Rete.Component {
    constructor() {
        super('Scalar');
        this.data.component = NodeRenderer;
    }

    builder(node) {
        node.addInput(new Rete.Input('num', 'Value', sockets.scalar));

        node.addControl(new ScalarControl(this.editor, 'numctl'));

        node.addOutput(new Rete.Output('num', 'Value', sockets.scalar));

        return node;
    }

    worker(node, inputs, outputs) {
        // TODO pull this out somewhere
        function getInput(name) {
            // Assumes only a single connection per input, which is currently enforced by the editor
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const editorNode = this.editor.nodes.find(n => n.id === node.id);

        const input = getInput('num');
        if (_.isNil(input)) {
            editorNode.controls.get('numctl').setReadOnly(false);
        } else {
            node.data.numctl = input;
            editorNode.controls.get('numctl').setValue(input);
            editorNode.controls.get('numctl').setReadOnly(true);
        }

        if (!_.isNil(node.data.numctl)) {
            outputs['num'] = node.data.numctl;
        }
    }
}
