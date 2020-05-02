import Rete from 'rete';
import ExtendableError from 'extendable-error-class';
import WarningControlView from './WarningControlView.vue';

export class CalculationError extends ExtendableError {
    constructor(message) {
        super(message);
        this.name = 'CalculationError';
    }
};

export class WarningControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        super(key);
        this.render = 'vue';
        this.component = WarningControlView;
        this.props = { emitter, dataKey: key, rowIdx };
    }

    setWarning(msg) {
        this.vueContext.warningMsg = msg;
    }
};
