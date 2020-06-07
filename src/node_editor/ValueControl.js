import Rete from 'rete';
import ValueControlView from './ValueControlView.vue';

export class ValueControl extends Rete.Control {
    constructor(nodeType, emitter, key, rowIdx) {
        // console.log('ValueControl constructor', key, nodeType);
        super(key);
        this.render = 'vue';
        this.component = ValueControlView;
        this.props = { emitter, dataKey: key, rowIdx, nodeType: nodeType };
    }

    setValue(val) {
        // console.log(`ValueControl setValue setting to ${val} (from ${this.vueContext.values})`);
        this.vueContext.setValue(val);
        // console.log('set vueContext.values to :', this.vueContext.values);
    }

    setReadOnly(readOnly) {
        // console.log(`ValueControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
