import Rete from 'rete';
import VectorLabelControlView from './VectorLabelControlView.vue';

export class VectorLabelControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        super(key);
        this.render = 'vue';
        this.component = VectorLabelControlView;
        this.props = { emitter, dataKey: key, rowIdx };
    }
};
