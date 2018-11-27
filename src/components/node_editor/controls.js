import Rete from 'rete';
import NumControlComponent from './NumControlComponent';
import VectorControlComponent from './VectorControlComponent';
import VectorOperationComponent from './VectorOperationComponent';

// TODO can I make a generic wrapper to avoid this boilerplate?
class NumControl extends Rete.Control {
    constructor(emitter, key, readonly = false) {
        super(key);
        this.render = 'vue';
        this.component = NumControlComponent;
        this.props = { emitter, vkey: key, readonly };
    }

    setValue(val) {
        console.log(`NumControl setValue to ${val}`);
        this.vueContext.value = val;
    }
}

class VectorControl extends Rete.Control {
    constructor(emitter, key, readonly = false) {
        super(key);
        this.render = 'vue';
        this.component = VectorControlComponent;
        this.props = { emitter, vkey: key, readonly };
    }

    setValue(val) {
        console.log(`VectorControl setValue to ${val}`);
        this.vueContext.value = val;
    }
}

class VectorOperationControl extends Rete.Control {
    constructor(emitter, key) {
        super(key);
        this.render = 'vue';
        this.component = VectorOperationComponent;
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
}

export default { NumControl, VectorControl, VectorOperationControl };
