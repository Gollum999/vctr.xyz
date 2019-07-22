import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ColorControl } from './ColorControl.js';
import { ScalarControl } from './ScalarControl.js';
import settings from '../settings';

export class ScalarComponent extends Rete.Component {
    constructor() {
        super('Scalar');
        this.data.component = NodeRenderer;
    }

    builder(node) {
        node.addInput(new Rete.Input('scalar', 'Value', sockets.scalar));

        node.addControl(new ScalarControl(this.editor, 'value', 1));
        node.addControl(new ColorControl(this.editor, 'color', 2, settings.loadSettings('nodeEditorSettings').defaultScalarColor));

        node.addOutput(new Rete.Output('scalar', 'Value', sockets.scalar));

        return node;
    }

    worker(node, inputs, outputs) {
        // TODO pull this out somewhere
        function getInput(name) {
            // Assumes only a single connection per input, which is currently enforced by the editor
            return inputs[name].length ? inputs[name][0] : node.data[name];
        }

        const editorNode = this.editor.nodes.find(n => n.id === node.id);
        // console.log('editorNode.controls', editorNode.controls);

        const input = getInput('scalar');
        if (_.isNil(input)) {
            editorNode.controls.get('value').setReadOnly(false);
        } else {
            node.data.value = input;
            editorNode.controls.get('value').setValue(input);
            editorNode.controls.get('value').setReadOnly(true);
        }

        if (!_.isNil(node.data.value)) {
            outputs['scalar'] = node.data.value;
        }
    }
}
