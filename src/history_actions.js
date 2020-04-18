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

// Add/RemoveConnectionAction are copied from rete-history-plugin
function reassignConnection(connection) {
    const { input, output } = connection;

    return output.connections.find(c => c.input === input);
}

export class AddConnectionAction extends Action {
    constructor(editor, connection) {
        // console.log('AddConnectionAction constructor', editor, connection);
        super();
        this.editor = editor;
        this.connection = connection;
    }
    undo() {
        // console.log('AddConnectionAction undo, removing', this.editor, this.connection);
        this.editor.removeConnection(this.connection);
    }
    redo() {
        // console.log('AddConnectionAction redo, connecting', this.editor, this.connection);
        this.editor.connect(this.connection.output, this.connection.input);
        // console.log('AddConnectionAction redo, reassigning connection', this.connection);
        this.connection = reassignConnection(this.connection);
    }
}

export class RemoveConnectionAction extends Action {
    constructor(editor, connection) {
        // console.log('RemoveConnectionAction constructor', editor, connection);
        super();
        this.editor = editor;
        this.connection = connection;
        // console.log('RemoveConnectionAction constructor, connection input', connection.input, connection.input.node);
    }
    undo() {
        // console.log('RemoveConnectionAction undo, connecting', this.editor, this.connection, this.connection.input, this.connection.output, this.connection.input.node, this.connection.output.node);
        this.editor.connect(this.connection.output, this.connection.input);
        // console.log('RemoveConnectionAction undo, reassigning connection', this.connection);
        this.connection = reassignConnection(this.connection);
    }
    redo() {
        // console.log('RemoveConnectionAction redo, removing', this.editor, this.connection);
        this.editor.removeConnection(this.connection);
    }
}

export class RemoveAdvancedRenderControlsAction extends Action {
    constructor(editor, node) {
        super();
        console.log('RemoveAdvancedRenderControlsAction constructor', node.id);
        this.editor = editor;
        this.node = node;
        this.connectionActions = [];
    }
    do() {
        console.log('RemoveAdvancedRenderControlsAction do, removing from node:', this.node.id, this.node);

        // Remove all connections
        const input = this.node.inputs.get('pos');
        if (input == null) {
            throw new Error(`Could not find 'pos' input for node ${this.node.id}`);
        }
        if (input.connections == null) {
            throw new Error(`Could not find connections for 'pos' for node ${this.node.id}`);
        }
        input.connections.map(conn => {
            this.connectionActions.push(new RemoveConnectionAction(this.editor, conn));
            this.editor.removeConnection(conn);
        });

        // Hide controls
        this.node.vueContext.showAdvancedRenderControls = false;
    }
    undo() {
        console.log('RemoveAdvancedRenderControlsAction undo, adding back to node:', this.node.id, this.node, this.node.controls, this.node.inputs, this.node.outputs);
        // Show controls
        this.node.vueContext.showAdvancedRenderControls = true;

        // Restore all of the old connections
        for (const action of this.connectionActions) {
            action.undo();
        }
        this.connectionActions = [];
    }
    redo() {
        this.do();
    }
}

// TODO probably cleaner to just make a common helper rather than abusing inheritance
export class AddAdvancedRenderControlsAction extends RemoveAdvancedRenderControlsAction {
    do() {
        super.undo();
    }
    undo() {
        super.redo();
    }
    redo() {
        super.undo();
    }
}

export class MultiAction extends Action {
    constructor(actions) { // Actions should be in the order that they happen; undos will happen in reverse order
        super();
        // console.log('MultiAction constructor, actions:', actions);
        this.actions = actions;
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
