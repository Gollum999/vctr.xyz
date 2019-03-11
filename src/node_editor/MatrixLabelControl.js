import Rete from 'rete';
import MatrixLabelControlView from './MatrixLabelControlView.vue';

export class MatrixLabelControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        super(key);
        this.render = 'vue';
        this.component = MatrixLabelControlView;
        this.props = { emitter, vkey: key, rowIdx };
    }
};
