import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ColorControl } from './ColorControl.js';
import { ScalarControl } from './ScalarControl.js';
import { VectorControl } from './VectorControl.js';
import settings from '../settings';

export class ScalarComponent extends Rete.Component {
    constructor(globalVuetify) {
        super('Scalar');
        this.globalVuetify = globalVuetify;
        this.data.component = NodeRenderer;
    }

    builder(node) {
        const nodeSettings = settings.loadSettings('nodeEditorSettings');

        node.addInput(new Rete.Input('scalar', 'Value', sockets.scalar));
        node.addInput(new Rete.Input('color_label', 'Color', null));

        node.addControl(new ScalarControl(this.editor, 'value', this.globalVuetify));
        node.addControl(new ColorControl(this.editor, 'color', 2, this.globalVuetify));
        if (nodeSettings.showAdvancedRenderSettings) {
            this.addAdvancedRenderControls(node);
        }

        node.addOutput(new Rete.Output('scalar', 'Value', sockets.scalar));

        return node;
    }

    addAdvancedRenderControls(node) {
        node.addInput(new Rete.Input('pos', 'Position', sockets.vector));
        node.addControl(new VectorControl(this.editor, 'pos', 3, this.globalVuetify));
    }

    removeAdvancedRenderControls(node) {
        const input = node.inputs.get('pos');
        if (input != null) {
            node.removeInput(input);
        }

        const control = node.controls.get('pos');
        if (control != null) {
            node.removeControl(control);
        }
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
