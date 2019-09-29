import Rete from 'rete';
import ValueControlView from './ValueControlView.vue';
import { ValueType } from './node_util';

export class MatrixControl extends Rete.Control {
    constructor(emitter, key, rowIdx, globalVuetify) {
        // console.log('MatrixControl constructor');
        super(key);
        this.render = 'vue';
        this.component = ValueControlView;
        this.props = { emitter, dataKey: key, globalVuetify, rowIdx, valueType: ValueType.MATRIX };
    }

    setValue(val) {
        // console.log('MatrixControl setValue to', val, '(from ', this.vueContext.values, ')');
        this.vueContext.setValue(val);
    }

    setReadOnly(readOnly) {
        // console.log(`MatrixControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
