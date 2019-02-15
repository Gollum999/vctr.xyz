import Rete from 'rete';
import VectorOperationControlView from './VectorOperationControlView.vue';

export class VectorOperationControl extends Rete.Control {
    constructor(emitter, key) {
        super(key);
        this.render = 'vue';
        this.component = VectorOperationControlView;
        this.props = { emitter, vkey: key };
    }

    getValue() {
        return this.vueContext.selected;
    }

    setValue(val) {
        this.vueContext.value = val; // TODO value here?  or selected?
    }
};
