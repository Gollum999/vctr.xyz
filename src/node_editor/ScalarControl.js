import Rete from 'rete';
import ScalarControlView from './ScalarControlView.vue';

// TODO can I make a generic wrapper to avoid this boilerplate?
export class ScalarControl extends Rete.Control {
    constructor(emitter, key, readOnly = false) {
        super(key);
        this.render = 'vue';
        this.component = ScalarControlView;
        this.props = { emitter, vkey: key, readOnly };
    }

    setValue(val) {
        console.log(`ScalarControl setValue to ${val}`);
        console.log(this);
        this.vueContext.value = val;
    }

    setReadOnly(readOnly) {
        console.log(`ScalarControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
