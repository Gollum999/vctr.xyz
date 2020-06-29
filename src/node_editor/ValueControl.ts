import Rete from 'rete';
import ValueControlView from './ValueControlView.vue';
import type { Emitter } from 'rete/types/core/emitter';
import type { EventsTypes as DefaultEvents } from 'rete/types/events';
import type { EventsTypes as CoreEvents } from 'rete/types/core/events';
import type { ValueNodeType } from './node_util';

export class ValueControl extends Rete.Control {
    private readonly render = 'vue';
    private readonly component = ValueControlView;
    private readonly props: object;
    public readonly vueContext: InstanceType<typeof ValueControlView> | null = null; // TODO public is a hack

    constructor(nodeType: ValueNodeType, emitter: Emitter<DefaultEvents & CoreEvents>, key: string, rowIdx: number) {
        // console.log('ValueControl constructor', key, nodeType);
        super(key);
        this.props = { emitter, dataKey: key, rowIdx, nodeType: nodeType };
    }

    setValue(val: Array<number>) {
        if (this.vueContext == null) {
            throw new Error('ValueControl Vue context was null');
        }
        // console.log(`ValueControl setValue setting to ${val} (from ${this.vueContext.values})`);
        this.vueContext.setValue(val);
        // console.log('set vueContext.values to :', this.vueContext.values);
    }

    setReadOnly(readOnly: boolean) {
        if (this.vueContext == null) {
            throw new Error('ValueControl Vue context was null');
        }
        // console.log(`ValueControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};
