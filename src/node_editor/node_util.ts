import _ from 'lodash';
import { union } from '../util';
import type { Input, Engine as NodeEngine, NodeEditor, Node } from 'rete';
import type { Input as DataInput, Output as DataOutput, Node as DataNode } from 'rete/types/core/data';
import type { IOs } from 'rete/types/engine/component';

// Note that the Rete engine does some node lookups by name, so each node type must have a unique name.
// This is especially important in here where I give the component some state; if the name is shared anywhere it will look up
//   the wrong worker() function during engine processing
/* eslint-disable no-multi-spaces */
export enum ValueNodeType {
    SCALAR        = 'Scalar',
    VECTOR        = 'Vector',
    MATRIX        = 'Matrix',
};

export enum UnaryOperationNodeType {
    LENGTH        = 'Length',
    INVERT        = 'Invert',
    NORMALIZE     = 'Normalize',
    TRANSPOSE     = 'Transpose',
    DETERMINANT   = 'Determinant',
};

export enum BinaryOperationNodeType {
    ADD           = 'Add',
    SUBTRACT      = 'Subtract',
    MULTIPLY      = 'Multiply',
    DIVIDE        = 'Divide',
    DOT_PRODUCT   = 'Dot Product',
    CROSS_PRODUCT = 'Cross Product',
    ANGLE         = 'Angle',
    PROJECTION    = 'Projection',
    EXPONENT      = 'Exponent',
};
/* eslint-enable no-multi-spaces */

export const NodeType = Object.freeze({
    ...ValueNodeType,
    ...UnaryOperationNodeType,
    ...BinaryOperationNodeType,
});

// TODO not sure the best way to organize these
export const BasicOperationNodeType = Object.freeze(new Set([
    BinaryOperationNodeType.ADD,
    BinaryOperationNodeType.SUBTRACT,
    BinaryOperationNodeType.MULTIPLY,
    BinaryOperationNodeType.DIVIDE,
    BinaryOperationNodeType.EXPONENT,
]));

export const AdvancedOperationNodeType = Object.freeze(new Set([
    UnaryOperationNodeType.LENGTH,
    UnaryOperationNodeType.INVERT,
    UnaryOperationNodeType.NORMALIZE,
    UnaryOperationNodeType.TRANSPOSE,
    UnaryOperationNodeType.DETERMINANT,
    BinaryOperationNodeType.DOT_PRODUCT,
    BinaryOperationNodeType.CROSS_PRODUCT,
    BinaryOperationNodeType.ANGLE,
    BinaryOperationNodeType.PROJECTION,
]));
console.assert(_.isEqual(
    union(Object.values(ValueNodeType) as Array<string>, [...BasicOperationNodeType.values()], [...AdvancedOperationNodeType.values()]),
    new Set(Object.values(NodeType)),
));

export const ADVANCED_RENDER_CONTROLS_KEY = 'pos';

export function getEditorNode(editor: NodeEditor, engineNode: DataNode): Node {
    const node = editor.nodes.find(n => n.id === engineNode.id);
    if (node == null) {
        throw new Error(`Could not find node with id ${engineNode.id}`);
    }
    return node;
}

export function hasInput(inputs: IOs, name: string): boolean {
    const input = inputs[name];
    return input !== undefined && input.length && input[0] !== undefined;
}

export function getInputValue(name: string, inputs: IOs, data: { [key: string]: any }): any {
    // Assumes only a single connection per input, which is currently enforced by the editor
    const input = inputs[name];
    return input !== undefined && input.length ? input[0] : data[name];
}

export class GraphTraveler {
    constructor(private readonly engine: NodeEngine, private readonly editor: NodeEditor) {
        this.engine = engine;
        this.editor = editor;
    }

    applyToAllNodes(fn: (engineNode: DataNode, editorNode: Node) => void): void {
        if (this.engine.data == null) {
            console.warn('[GraphTraveler.applyToAllNodes] Engine data was null', this.engine);
            return;
        }

        for (const node of this._topologicalSort(Object.values(this.engine.data.nodes))) {
            const editorNode = getEditorNode(this.editor, node);
            fn(node, editorNode);
        }
    }

    _buildReverseAdjacencyList(nodes: Array<DataNode>): Map<number, Array<number>> {
        const result = new Map();
        for (const node of nodes) {
            const inputIds = [];
            for (const input of Object.values(node.inputs) as Array<DataInput>) {
                for (const connection of input.connections) {
                    inputIds.push(connection.node);
                }
            }
            result.set(node.id, inputIds);
        }
        return result;
    }

    _findNode(id: number): DataNode {
        const data = this.engine.data;
        if (data == null) {
            throw new Error('Engine data was null');
        }
        const node: DataNode | null = data.nodes[id];
        if (node == null) {
            throw new Error(`Could not find node with id ${id}`);
        }
        return node;
    }

    // https://en.wikipedia.org/wiki/Topological_sorting#Kahn's_algorithm
    _topologicalSort(nodes: Array<DataNode>): Array<DataNode> {
        const result = [];
        const startNodes = this._getStartNodes(nodes);
        const reverseAdjacencyList = this._buildReverseAdjacencyList(nodes); // Map node ID -> [input node IDs]

        while (startNodes.length > 0) {
            const current = startNodes.pop();
            if (current == null) {
                throw new Error('Node was null');
            }
            result.push(current);
            for (const output of Object.values(current.outputs) as Array<DataOutput>) {
                for (const connection of output.connections) {
                    const nextNode = this._findNode(connection.node);
                    let nextNodeInputs = reverseAdjacencyList.get(nextNode.id);
                    if (nextNodeInputs == null) {
                        throw new Error(`Could not find next inputs for node id ${nextNode.id}`);
                    }
                    nextNodeInputs = nextNodeInputs.filter(id => id !== current.id); // Remove this edge
                    reverseAdjacencyList.set(nextNode.id, nextNodeInputs);
                    if (!nextNodeInputs.length) {
                        startNodes.push(nextNode);
                    }
                }
            }
        }

        if (Array.from(reverseAdjacencyList.values()).some(ids => ids.length !== 0)) {
            throw new Error(`Cycle detected; some edges still remain unresolved: ${reverseAdjacencyList}`);
        }
        return result;
    }

    _getStartNodes(nodes: Array<DataNode>): Array<DataNode> {
        return nodes.filter(node => Object.values(node.inputs).every((input: DataInput) => input.connections.length === 0));
    }
};
