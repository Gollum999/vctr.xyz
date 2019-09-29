import Rete from 'rete';
import ValueControlView from './ValueControlView.vue';
import { ValueType } from './node_util';

// TODO can I make a generic wrapper to avoid this boilerplate?
export class ScalarControl extends Rete.Control {
    constructor(emitter, key, globalVuetify) {
        super(key);
        this.render = 'vue';
        this.component = ValueControlView;
        this.props = { emitter, dataKey: key, globalVuetify, rowIdx: 0, valueType: ValueType.SCALAR };
    }

    setValue(val) {
        this.vueContext.value = val;
    }

    setReadOnly(readOnly) {
        this.vueContext.readOnly = readOnly;
    }
};
