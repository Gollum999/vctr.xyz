import Rete from 'rete';
import AxesLabelControlView from './AxesLabelControlView.vue';
import { ValueType } from './node_util';

export class AxesLabelControl extends Rete.Control {
    constructor(valueType, emitter, key, rowIdx) {
        super(key);
        this.render = 'vue';
        this.component = AxesLabelControlView;

        if (valueType === ValueType.VECTOR) {
            this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z'] };
        } else if (valueType === ValueType.MATRIX) {
            this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z', 'W'] };
        } else {
            throw new Error('AxesLabelControl only supported for Vector/Matrix');
        }
    }
};
