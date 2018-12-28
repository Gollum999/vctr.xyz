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
        console.log('VectorOperationControl getValue');
        /* console.log(this);
         * console.log(this.vueContext);
         * console.log(this.vueContext.selected);
         * console.log(this.vueContext.getData(this.props.vkey));
         * console.log(this.vueContext._data.selected);
         * console.log(this.vueContext.$data.selected); */
        return this.vueContext.selected;
    }

    setValue(val) {
        console.log(`VectorOperationControl setValue to ${val}`);
        this.vueContext.value = val; // TODO value here?  or selected?
    }
};
