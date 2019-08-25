import Rete from 'rete';
import ScalarControlView from './ScalarControlView.vue';

// TODO can I make a generic wrapper to avoid this boilerplate?
export class ScalarControl extends Rete.Control {
    constructor(emitter, key, globalVuetify) {
        super(key);
        this.render = 'vue';
        this.component = ScalarControlView;
        this.props = { emitter, dataKey: key, globalVuetify};
    }

    setValue(val) {
        this.vueContext.value = val;
    }

    setReadOnly(readOnly) {
        this.vueContext.readOnly = readOnly;
    }
};
