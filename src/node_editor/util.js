export default {
    getEditorNode(editor, node) {
        return editor.nodes.find(n => n.id === node.id);
    },

    getInputValue(name, inputs, data) {
        // Assumes only a single connection per input, which is currently enforced by the editor
        return inputs[name].length ? inputs[name][0] : data[name];
    },

    // Is x a subset of y?
    isSubset(x, y) {
        return Array.from(x).every(val => y.has(val));
    },

    // Do x and y intersect?
    intersects(x, y) {
        return Array.from(x).some(val => y.has(val));
    },

    // What are the common elements between x and y?
    intersection(x, y) {
        return new Set([...x].filter(val => y.has(val)));
    },
};
