import Rete from 'rete';
import Vue from 'vue';
import ExtendableError from 'extendable-error-class';
import WarningControlView from './WarningControlView.vue';
import type { Emitter } from 'rete/types/core/emitter';
import type { EventsTypes as DefaultEvents } from 'rete/types/events';
import type { EventsTypes as CoreEvents } from 'rete/types/core/events';

export class CalculationError extends ExtendableError {
    private readonly name: string;

    constructor(message: string) {
        super(message);
        this.name = 'CalculationError';
    }
};

export class WarningControl extends Rete.Control {
    private readonly render = 'vue';
    private readonly component = WarningControlView;
    private readonly props: object;
    private readonly vueContext: InstanceType<typeof WarningControlView> | null = null;

    constructor(emitter: Emitter<DefaultEvents & CoreEvents>, key: string, rowIdx: number) {
        super(key);
        this.props = { emitter, dataKey: key, rowIdx };
    }

    setWarning(msg: string): void {
        if (this.vueContext == null) {
            throw new Error('WarningControl Vue context was null');
        }
        this.vueContext.warningMsg = msg;
    }
};
