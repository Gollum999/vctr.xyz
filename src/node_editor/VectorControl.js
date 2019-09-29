import Rete from 'rete';
import ValueControlView from './ValueControlView.vue';
import { ValueType } from './node_util';

export class VectorControl extends Rete.Control {
    constructor(emitter, key, rowIdx, globalVuetify) {
        // console.log('VectorControl constructor');
        super(key);
        this.render = 'vue';
        this.component = ValueControlView;
        this.props = { emitter, dataKey: key, globalVuetify, rowIdx, valueType: ValueType.VECTOR };
    }

    setValue(val) {
        // console.log(`VectorControl setValue setting to ${val} (from ${this.vueContext.values})`);
        this.vueContext.setValue(val);
        // console.log('set vueContext.values to :', this.vueContext.values);
    }

    setReadOnly(readOnly) {
        // console.log(`VectorControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
