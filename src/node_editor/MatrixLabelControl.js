import Rete from 'rete';
import AxesLabelControlView from './AxesLabelControlView.vue';

export class MatrixLabelControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        super(key);
        this.render = 'vue';
        this.component = AxesLabelControlView;
        this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z', 'W'] };
    }
};
