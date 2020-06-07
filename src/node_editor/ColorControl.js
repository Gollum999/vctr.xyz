import Rete from 'rete';
import ColorControlView from './ColorControlView.vue';

export class ColorControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        super(key);
        // console.log(`ColorControl constrtuctor, key: ${key}, row idx: ${rowIdx}`, this, this._vue, this.vueContext);
        this.render = 'vue';
        this.component = ColorControlView;
        this.props = { emitter, dataKey: key, rowIdx };
    }

    setValue(val) {
        // console.log(`ColorControl setValue to ${val}`);
        this.vueContext.color = val;
    }
};
