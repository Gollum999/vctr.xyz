import { Action } from 'rete-history-plugin';

export class FieldChangeAction extends Action {
    constructor(oldValue, newValue, setter) {
        super();
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.setter = setter;
    }
    do() {
        this.redo();
    }
    undo() {
        this.setter(this.oldValue);
    }
    redo() {
        this.setter(this.newValue);
    }
}

// Add/RemoveConnectionAction are copied (and slightly modified) from rete-history-plugin
function reassignConnection(connection) {
    const { input, output } = connection;

    return output.connections.find(c => c.input === input);
}

class ConnectionActionHelper {
    constructor(editor, connection) {
        // console.log('ConnectionActionHelper constructor', editor, connection);
        this.editor = editor;
        this.connection = connection;
    }
    add() {
        // console.log('ConnectionActionHelper redo, connecting', this.editor, this.connection);
        this.editor.connect(this.connection.output, this.connection.input);
        // console.log('ConnectionActionHelper redo, reassigning connection', this.connection);
        this.connection = reassignConnection(this.connection);
    }
    remove() {
        // console.log('ConnectionActionHelper undo, removing', this.editor, this.connection);
        // TODO: 'connectioncreated'/'connectionremoved' events automatically add themselves to the history...
        //       May need to fork the entire history plugin myself to work around this and avoid duplicate events
        this.editor.removeConnection(this.connection);
    }
}

export class AddConnectionAction extends Action {
    constructor(editor, connection) {
        super();
        this.helper = new ConnectionActionHelper(editor, connection);
    }
    do() {
        this.helper.add();
    }
    undo() {
        this.helper.remove();
    }
    redo() {
        this.helper.add();
    }
}

export class RemoveConnectionAction extends Action {
    constructor(editor, connection) {
        super();
        this.helper = new ConnectionActionHelper(editor, connection);
    }
    do() {
        this.helper.remove();
    }
    undo() {
        this.helper.add();
    }
    redo() {
        this.helper.remove();
    }
}

class AdvancedRenderControlsActionHelper {
    constructor(editor, node) {
        console.log('AdvancedRenderControlsActionHelper constructor', node.id);
        this.editor = editor;
        this.node = node;
        this.connectionActions = [];
    }
    add() {
        console.log('AdvancedRenderControlsActionHelper add to node:', this.node.id, this.node, this.node.controls, this.node.inputs, this.node.outputs);
        // Restore all of the old connections
        for (const action of this.connectionActions) {
            // console.log('AdvancedRenderControlsActionHelper undoing connection action', action);
            action.undo();
        }
        this.connectionActions = [];
    }
    remove() {
        console.log('AdvancedRenderControlsActionHelper remove from node:', this.node.id, this.node);

        // Remove all connections
        const input = this.node.inputs.get('pos'); // TODO make this more generic
        if (input == null) {
            throw new Error(`Could not find 'pos' input for node ${this.node.id}`);
        }
        if (input.connections == null) {
            throw new Error(`Could not find connections for 'pos' for node ${this.node.id}`);
        }
        input.connections.map(conn => {
            const removeConnectionAction = new RemoveConnectionAction(this.editor, conn);
            removeConnectionAction.do();
            this.connectionActions.push(removeConnectionAction);
        });
    }
}

export class AddAdvancedRenderControlsAction extends Action {
    constructor(editor, node) {
        super();
        this.helper = new AdvancedRenderControlsActionHelper(editor, node);
    }
    do() {
        this.helper.add();
    }
    undo() {
        this.helper.remove();
    }
    redo() {
        this.helper.add();
    }
}

export class RemoveAdvancedRenderControlsAction extends Action {
    constructor(editor, node) {
        super();
        this.helper = new AdvancedRenderControlsActionHelper(editor, node);
    }
    do() {
        this.helper.remove();
    }
    undo() {
        this.helper.add();
    }
    redo() {
        this.helper.remove();
    }
}

export class MultiAction extends Action {
    constructor(actions) { // Actions should be in the order that they happen; undos will happen in reverse order
        super();
        // console.log('MultiAction constructor, actions:', actions);
        this.actions = actions;
    }
    do() {
        // console.log('MultiAction do', this.actions);
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
        // console.log('MultiAction redo', this.actions);
        for (const action of this.actions) {
            action.redo();
        }
    }
}

export default {
    FieldChangeAction,
    AddConnectionAction,
    RemoveConnectionAction,
    AddAdvancedRenderControlsAction,
    RemoveAdvancedRenderControlsAction,
    MultiAction,
};
