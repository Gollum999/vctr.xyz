import Rete from 'rete';
import Vue from 'vue';
import AxesLabelControlView from './AxesLabelControlView.vue';
import { ValueNodeType } from './node_util';
import type { Emitter } from 'rete/types/core/emitter';
import type { EventsTypes as DefaultEvents } from 'rete/types/events';
import type { EventsTypes as CoreEvents } from 'rete/types/core/events';

export class AxesLabelControl extends Rete.Control {
    private readonly render = 'vue';
    private readonly component = AxesLabelControlView;
    private readonly props: object;
    private readonly vueContext: InstanceType<typeof AxesLabelControlView> | null = null;

    constructor(nodeType: ValueNodeType, emitter: Emitter<DefaultEvents & CoreEvents>, key: string, rowIdx: number) {
        super(key);
        if (nodeType === ValueNodeType.VECTOR) {
            this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z'] };
        } else if (nodeType === ValueNodeType.MATRIX) {
            this.props = { emitter, dataKey: key, rowIdx, axes: ['X', 'Y', 'Z', 'W'] };
        } else {
            throw new Error('AxesLabelControl only supported for Vector/Matrix');
        }
    }
};
