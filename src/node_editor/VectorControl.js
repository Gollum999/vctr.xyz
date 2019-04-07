import Rete from 'rete';
import VectorControlView from './VectorControlView.vue';

export class VectorControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        // console.log('VectorControl constructor');
        super(key);
        this.render = 'vue';
        this.component = VectorControlView;
        this.props = { emitter, vkey: key, rowIdx };
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
