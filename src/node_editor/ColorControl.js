import Rete from 'rete';
import ColorControlView from './ColorControlView.vue';

export class ColorControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        console.log(`ColorControl constrtuctor, row idx: ${rowIdx}`);
        super(key);
        this.render = 'vue';
        this.component = ColorControlView;
        this.props = { emitter, vkey: key, rowIdx };
    }

    setValue(val) {
        console.log(`ColorControl setValue to ${val}`);
        this.vueContext.color = val;
    }
};
