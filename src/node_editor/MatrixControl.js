import Rete from 'rete';
import MatrixControlView from './MatrixControlView.vue';

export class MatrixControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        // console.log('MatrixControl constructor');
        super(key);
        this.render = 'vue';
        this.component = MatrixControlView;
        this.props = { emitter, dataKey: key, rowIdx };
    }

    setValue(val) {
        // console.log('MatrixControl setValue to', val, '(from ', this.vueContext.values, ')');
        this.vueContext.setValue(val);
    }

    setReadOnly(readOnly) {
        console.log(`MatrixControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
