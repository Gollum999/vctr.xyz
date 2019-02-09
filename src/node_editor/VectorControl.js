import Rete from 'rete';
import VectorControlView from './VectorControlView.vue';

export class VectorControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        console.log('VectorControl constrtuctor');
        super(key);
        this.render = 'vue';
        this.component = VectorControlView;
        this.props = { emitter, vkey: key, rowIdx };
    }

    setValue(val) {
        console.log(`VectorControl setValue to ${val} (from ${this.vueContext.value})`);
        // TODO Setting all values at once has a few bugs (e.g. change the value of one axis, then connect a different vector as input;
        //      the updated axis won't change to the new value).  I think it has something to do with how Vue handles reactivity of objects.
        // this.vueContext.value = val;
        this.vueContext.value[0] = val[0];
        this.vueContext.value[1] = val[1];
        this.vueContext.value[2] = val[2];
    }

    setReadOnly(readOnly) {
        console.log(`VectorControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
