// Copied and modified from rete-history-plugin
export class History {
    constructor() {
        this.disabled = false;
        this.produced = [];
        this.reserved = [];
    }

    add(action) {
        if (this.disabled) {
            console.log('Not adding', action, 'because history is currently disabled');
            return;
        }
        console.log('Adding history action', action);
        this.produced.push(action);
        this.reserved = [];
    }

    addAndDo(action) {
        action.do();
        this.add(action);
    }

    get last() {
        return this.produced[this.produced.length - 1];
    }

    _do(from, to, type) {
        const action = from.pop();

        if (!action) {
            return;
        }

        this.disableDuring(() => {
            action[type]();
            to.push(action);
        });
    }

    canUndo() {
        console.log('canUndo: ', this.produced.length);
        return this.produced.length > 0;
    }

    canRedo() {
        console.log('canRedo: ', this.reserved.length);
        return this.reserved.length > 0;
    }

    undo() {
        this._do(this.produced, this.reserved, 'undo');
    }

    redo() {
        this._do(this.reserved, this.produced, 'redo');
    }

    disable() {
        this.disabled = true;
    }

    enable() {
        this.disabled = false;
    }

    disableDuring(body) {
        this.disable();
        body();
        this.enable();
    }
}

export default new History();
