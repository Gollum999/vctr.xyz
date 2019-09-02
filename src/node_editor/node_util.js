export default {
    getEditorNode(editor, engineNode) {
        return editor.nodes.find(n => n.id === engineNode.id);
    },

    getInputValue(name, inputs, data) {
        // Assumes only a single connection per input, which is currently enforced by the editor
        return inputs[name].length ? inputs[name][0] : data[name];
    },
};
