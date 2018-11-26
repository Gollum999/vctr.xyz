import Rete from 'rete';
import NumControlComponent from './NumControlComponent';

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

export default { NumControl };
