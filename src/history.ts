import { Action, MultiAction } from './history_actions';

// Copied and modified from rete-history-plugin
export class History {
    private disabledCount: number;
    private produced: Array<Action>;
    private reserved: Array<Action>;

    constructor() {
        this.disabledCount = 0;
        this.produced = [];
        this.reserved = [];
    }

    add(action: Action): void {
        if (this.disabledCount) {
            console.log('Not adding', action, 'because history is currently disabled');
            return;
        }
        console.log('Adding history action', action);
        this.produced.push(action);
        this.reserved = [];
    }

    addAndDo(action: Action): void {
        this.disableDuring(() => {
            action.do();
        });
        this.add(action);
    }

    get last(): Action {
        return this.produced[this.produced.length - 1];
    }

    get length(): number {
        return this.produced.length;
    }

    _do(fromStack: Array<Action>, toStack: Array<Action>, fnName: keyof Action): void {
        const action = fromStack.pop();

        if (!action) {
            return;
        }

        this.disableDuring(() => {
            action[fnName]();
            toStack.push(action);
        });
    }

    canUndo(): boolean {
        console.log('canUndo: ', this.produced.length);
        return this.produced.length > 0;
    }

    canRedo(): boolean {
        console.log('canRedo: ', this.reserved.length);
        return this.reserved.length > 0;
    }

    undo(): void {
        this._do(this.produced, this.reserved, 'undo');
    }

    redo(): void {
        this._do(this.reserved, this.produced, 'redo');
    }

    // TODO rename?  'disable' just means disallow adding new actions, but undo/redo still allowed
    disable(): void {
        // Why not just use a boolean?  This lets me have multiple scopes of disabling at once that overlap
        ++this.disabledCount;
        // console.log('HISTORY DISABLE', this.disabledCount);
    }

    enable(): void {
        --this.disabledCount;
        // console.log('HISTORY ENABLE', this.disabledCount);
        if (this.disabledCount < 0) {
            throw new Error('History disabled more than enabled');
        }
    }

    disableDuring(body: () => void): void {
        this.disable();
        body();
        this.enable();
    }

    squashTopActions(count: number): void {
        console.assert(count >= 2, 'Not enough actions to squash');
        const actions = [];
        for (let i = 0; i < count; ++i) {
            const action = this.produced.pop();
            if (action == null) {
                throw new Error('Failed to pop history action');
            }
            actions.push(action);
        }
        this.add(new MultiAction(actions.reverse()));
    }

    // idx is inclusive
    squashTopActionsDownToIndex(idx: number): void {
        this.squashTopActions(this.produced.length - idx);
    }
}

export default new History();
