import Rete from 'rete';
import AxesLabelControlView from './AxesLabelControlView.vue';
import { ValueNodeType } from './node_util';

export class AxesLabelControl extends Rete.Control {
    constructor(nodeType, emitter, key, rowIdx) {
        super(key);
        this.render = 'vue';
        this.component = AxesLabelControlView;

        if (nodeType === ValueNodeType.VECTOR) {
            this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z'] };
        } else if (nodeType === ValueNodeType.MATRIX) {
            this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z', 'W'] };
        } else {
            throw new Error('AxesLabelControl only supported for Vector/Matrix');
        }
    }
};
