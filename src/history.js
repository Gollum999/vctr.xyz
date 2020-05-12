// Copied and modified from rete-history-plugin
export class History {
    constructor() {
        this.disabledCount = 0;
        this.produced = [];
        this.reserved = [];
    }

    add(action) {
        if (this.disabledCount) {
            console.log('Not adding', action, 'because history is currently disabled');
            return;
        }
        console.log('Adding history action', action);
        this.produced.push(action);
        this.reserved = [];
    }

    addAndDo(action) {
        this.disableDuring(() => {
            action.do();
        });
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

    // TODO rename?  'disable' just means disallow adding new actions, but undo/redo still allowed
    disable() {
        // Why not just use a boolean?  This lets me have multiple scopes of disabling at once that overlap
        ++this.disabledCount;
        // console.log('HISTORY DISABLE', this.disabledCount);
    }

    enable() {
        --this.disabledCount;
        // console.log('HISTORY ENABLE', this.disabledCount);
        if (this.disabledCount < 0) {
            throw new Error('History disabled more than enabled');
        }
    }

    disableDuring(body) {
        this.disable();
        body();
        this.enable();
    }
}

export default new History();