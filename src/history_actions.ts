import _ from 'lodash';
import { Connection } from 'rete/types/connection';
import { NodeEditor } from 'rete/types/editor';
import { Node } from 'rete/types/node';

export class Action {
    do(): void { this.redo(); }
    undo(): void { throw new Error('Not implemented'); }
    redo(): void { throw new Error('Not implemented'); }
}

export class MultiAction extends Action {
    // Actions should be in the order that they happen; undos will happen in reverse order
    constructor(private readonly actions: Array<Action>) {
        super();
        this.actions = actions;
    }
    do() {
        for (const action of this.actions) {
            action.do();
        }
    }
    undo() {
        for (let i = this.actions.length - 1; i >= 0; --i) {
            this.actions[i].undo();
        }
    }
    redo() {
        for (const action of this.actions) {
            action.redo();
        }
    }
}

export class FieldChangeAction extends Action {
    constructor(private readonly oldValue: any, private readonly newValue: any, private readonly setter: (newVal: any) => void) {
        super();
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.setter = setter;
    }
    undo() { this.setter(this.oldValue); }
    redo() { this.setter(this.newValue); }
}

// Add/RemoveConnectionAction are copied (and slightly modified) from rete-history-plugin
function findNewConnection(oldConnection: Connection): Connection {
    const { input, output } = oldConnection;
    const newConnection = output.connections.find(c => c.input === input);
    if (newConnection == null) {
        throw new Error(`Could not find new connection from ${oldConnection}`);
    }
    return newConnection;
}

class ConnectionActionHelper {
    constructor(private readonly editor: NodeEditor, private connection: Connection) {
        this.editor = editor;
        this.connection = connection;
    }
    add() {
        this.editor.connect(this.connection.output, this.connection.input);
    }
    remove() {
        this.editor.removeConnection(findNewConnection(this.connection));
    }
}

export class AddConnectionAction extends Action {
    private readonly helper: ConnectionActionHelper;

    constructor(editor: NodeEditor, connection: Connection) {
        super();
        this.helper = new ConnectionActionHelper(editor, connection);
    }
    undo() { this.helper.remove(); }
    redo() { this.helper.add(); }
}

export class RemoveConnectionAction extends Action {
    private readonly helper: ConnectionActionHelper;

    constructor(editor: NodeEditor, connection: Connection) {
        super();
        this.helper = new ConnectionActionHelper(editor, connection);
    }
    undo() { this.helper.add(); }
    redo() { this.helper.remove(); }
}

export class RemoveAllConnectionsAction extends Action {
    private readonly action: MultiAction;

    constructor(editor: NodeEditor) {
        super();
        this.action = new MultiAction([
            ...Array.from(editor.view.connections.keys()).map(cxn => new RemoveConnectionAction(editor, cxn)),
        ]);
    }
    do() { this.action.do(); }
    undo() { this.action.undo(); }
    redo() { this.action.redo(); }
}

export class RemoveAllNodeInputConnectionsAction extends Action {
    private readonly action: MultiAction;

    constructor(editor: NodeEditor, node: Node) {
        super();
        this.action = new MultiAction([
            ...Array.from(node.inputs.values()).map(io => {
                return io.connections.map(cxn => new RemoveConnectionAction(editor, cxn));
            }).flat(),
        ]);
    }
    do() { this.action.do(); }
    undo() { this.action.undo(); }
    redo() { this.action.redo(); }
}

export class RemoveAllNodeOutputConnectionsAction extends Action {
    private readonly action: MultiAction;

    constructor(editor: NodeEditor, node: Node) {
        super();
        this.action = new MultiAction([
            ...Array.from(node.outputs.values()).map(io => {
                return io.connections.map(cxn => new RemoveConnectionAction(editor, cxn));
            }).flat(),
        ]);
    }
    do() { this.action.do(); }
    undo() { this.action.undo(); }
    redo() { this.action.redo(); }
}

// Likewise, these are copied and modified from rete-history-plugin
class NodeAction extends Action {
    constructor(protected readonly editor: NodeEditor, public readonly node: Node) {
        super();
        this.editor = editor;
        this.node = node;
    }
}

export class AddNodeAction extends NodeAction {
    undo() { this.editor.removeNode(this.node); }
    redo() { this.editor.addNode(this.node); }
}

export class RemoveNodeAction extends NodeAction {
    undo() { this.editor.addNode(this.node); }
    redo() { this.editor.removeNode(this.node); }
}

type Position = [number, number];
export class DragNodesAction extends Action {
    private readonly editor: NodeEditor;
    private readonly oldPositions: Map<number, Position>;
    private newPositions: Map<number, Position>;

    constructor(editor: NodeEditor) {
        super();
        this.editor = editor;
        this.oldPositions = new Map(this.editor.selected.list.map(node => [node.id, [...node.position]]));
        this.newPositions = new Map(this.oldPositions.entries());
    }

    _translate(positionMap: Map<number, Position>) {
        for (const [nodeId, position] of positionMap) {
            const node = this.editor.nodes.find(node => node.id === nodeId);
            if (node == null) {
                throw new Error(`Could not find node with id ${nodeId}`);
            }
            const nodeView = this.editor.view.nodes.get(node);
            if (nodeView == null) {
                throw new Error(`Could not find node view with id ${nodeId}`);
            }
            nodeView.translate(...position);
        }
    }

    undo() {
        this._translate(this.oldPositions);
    }
    redo() {
        this._translate(this.newPositions);
    }
    update(node: Node) {
        this.newPositions.set(node.id, [...node.position]);
    }
    anyNodeMoved() {
        return [...this.oldPositions.entries()].some(([oldId, oldPos]) => !_.isEqual(oldPos, this.newPositions.get(oldId)));
    }
}

export class RemoveAllNodesAction extends Action {
    private readonly action: MultiAction;

    constructor(editor: NodeEditor) {
        super();
        this.action = new MultiAction([
            ...editor.nodes.map(node => new RemoveNodeAction(editor, node)),
        ]);
    }
    do() { this.action.do(); }
    undo() { this.action.undo(); }
    redo() { this.action.redo(); }
}

class AdvancedRenderControlsActionHelper {
    private readonly editor: NodeEditor;
    private readonly node: Node;
    private readonly inputName: string;
    private connectionActions: Array<RemoveConnectionAction>;

    constructor(editor: NodeEditor, node: Node, inputName: string) {
        this.editor = editor;
        this.node = node;
        this.inputName = inputName;
        this.connectionActions = [];
    }
    add() {
        // Restore all of the old connections
        for (const action of this.connectionActions) {
            action.undo();
        }
        this.connectionActions = [];
    }
    remove() {
        // Remove all connections
        const input = this.node.inputs.get(this.inputName);
        if (input == null) {
            throw new Error(`Could not find '${this.inputName}' input for node ${this.node.id}`);
        }
        if (input.connections == null) {
            throw new Error(`Could not find connections for '${this.inputName}' for node ${this.node.id}`);
        }
        input.connections.map(conn => {
            const removeConnectionAction = new RemoveConnectionAction(this.editor, conn);
            removeConnectionAction.do();
            this.connectionActions.push(removeConnectionAction);
        });
    }
}

export class AddAdvancedRenderControlsAction extends Action {
    private readonly helper: AdvancedRenderControlsActionHelper;

    constructor(editor: NodeEditor, node: Node, inputName: string) {
        super();
        this.helper = new AdvancedRenderControlsActionHelper(editor, node, inputName);
    }
    undo() { this.helper.remove(); }
    redo() { this.helper.add(); }
}

export class RemoveAdvancedRenderControlsAction extends Action {
    private readonly helper: AdvancedRenderControlsActionHelper;

    constructor(editor: NodeEditor, node: Node, inputName: string) {
        super();
        this.helper = new AdvancedRenderControlsActionHelper(editor, node, inputName);
    }
    undo() { this.helper.add(); }
    redo() { this.helper.remove(); }
}
