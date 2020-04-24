function getEditorNode(editor, engineNode) {
    return editor.nodes.find(n => n.id === engineNode.id);
}

export class GraphTraveler {
    constructor(engine, editor) {
        this.engine = engine;
        this.editor = editor;
    }

    applyToAllNodes(fn) {
        if (this.engine.data == null) {
            console.warn('[GraphTraveler.applyToAllNodes] Engine data was null', this.engine);
            return;
        }

        for (const node of this._topologicalSort(Object.values(this.engine.data.nodes))) {
            const editorNode = getEditorNode(this.editor, node);
            fn(node, editorNode);
        }
    }

    _buildReverseAdjacencyList(nodes) {
        const result = new Map();
        for (const node of nodes) {
            const inputIds = [];
            for (const input of Object.values(node.inputs)) {
                for (const connection of input.connections) {
                    inputIds.push(connection.node);
                }
            }
            result.set(node.id, inputIds);
        }
        return result;
    }

    _findNode(id) {
        return this.engine.data.nodes[id];
    }

    // https://en.wikipedia.org/wiki/Topological_sorting#Kahn's_algorithm
    _topologicalSort(nodes) {
        const result = [];
        const startNodes = this._getStartNodes(nodes);
        const reverseAdjacencyList = this._buildReverseAdjacencyList(nodes); // Map node ID -> [input node IDs]

        while (startNodes.length) {
            // TODO make sure I am using references everywhere here
            const current = startNodes.pop();
            result.push(current);
            for (const output of Object.values(current.outputs)) {
                for (const connection of output.connections) {
                    const nextNode = this._findNode(connection.node);
                    const nextNodeInputs = reverseAdjacencyList.get(nextNode.id).filter(id => id !== current.id); // Remove this edge
                    reverseAdjacencyList.set(nextNode.id, nextNodeInputs);
                    if (!nextNodeInputs.length) {
                        startNodes.push(nextNode);
                    }
                }
            }
        }

        if (Array.from(reverseAdjacencyList.values()).some(ids => ids.length !== 0)) {
            throw new Error('Cycle detected; some edges still remain unresolved', reverseAdjacencyList);
        }
        return result;
    }

    _getStartNodes(nodes) {
        return nodes.filter(node => Object.values(node.inputs).every(input => input.connections.length === 0));
    }
};

export const ValueType = {
    SCALAR: 'scalar',
    VECTOR: 'vector',
    MATRIX: 'matrix',
};

export default {
    getEditorNode,

    hasInput(inputs, name) {
        return inputs[name] !== undefined && inputs[name].length && inputs[name][0] !== undefined;
    },

    getInputValue(name, inputs, data) {
        // Assumes only a single connection per input, which is currently enforced by the editor
        return inputs[name].length ? inputs[name][0] : data[name];
    },
};
