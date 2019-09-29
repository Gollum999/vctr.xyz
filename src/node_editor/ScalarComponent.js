import _ from 'lodash';
import NodeRenderer from './NodeRenderer.vue';
import Rete from 'rete';
import sockets from './sockets';
import { ColorControl } from './ColorControl.js';
import { ScalarControl } from './ScalarControl.js';
import { VectorControl } from './VectorControl.js';
import settings from '../settings';
import util from './node_util';

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
        node.data.pos = [0, 0, 0];

        const input = node.inputs.get('pos');
        if (input != null) {
            input.connections.map(this.editor.removeConnection.bind(this.editor)); // node.removeInput removes the data connections, but not the view connections
            node.removeInput(input);
        }

        const control = node.controls.get('pos');
        if (control != null) {
            node.removeControl(control);
        }
    }

    worker(node, inputs, outputs) {
        const editorNode = this.editor.nodes.find(n => n.id === node.id);

        if (util.hasInput(inputs, 'scalar')) {
            const inputValue = util.getInputValue('scalar', inputs, node.data);
            node.data.value = inputValue;
            editorNode.controls.get('value').setValue(inputValue);
            editorNode.controls.get('value').setReadOnly(true);
        } else {
            editorNode.controls.get('value').setReadOnly(false);
        }

        const posControl = editorNode.controls.get('pos');
        if (!_.isNil(posControl)) {
            if (util.hasInput(inputs, 'pos')) {
                const inputPos = util.getInputValue('pos', inputs, node.data);
                node.data.pos = inputPos.slice(); // Make a copy to avoid sharing the same object between nodes
                posControl.setValue(inputPos);
                posControl.setReadOnly(true);
            } else {
                posControl.setReadOnly(false);
            }
        }

        if (!_.isNil(node.data.value)) {
            outputs['scalar'] = node.data.value.slice(); // Make a copy to avoid sharing the same object between nodes
        }
    }
}
