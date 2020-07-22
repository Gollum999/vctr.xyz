import Rete from 'rete';
import ColorControlView from './ColorControlView.vue';
import type { Emitter } from 'rete/types/core/emitter';
import type { EventsTypes as DefaultEvents } from 'rete/types/events';
import type { EventsTypes as CoreEvents } from 'rete/types/core/events';

export class ColorControl extends Rete.Control {
    private readonly render = 'vue';
    private readonly component = ColorControlView;
    private readonly props: object;
    private readonly vueContext: InstanceType<typeof ColorControlView> | null = null;

    constructor(emitter: Emitter<DefaultEvents & CoreEvents>, key: string, rowIdx: number) {
        super(key);
        this.props = { emitter, dataKey: key, rowIdx };
    }

    setValue(val: string) {
        if (this.vueContext == null) {
            throw new Error('ColorControl Vue context was null');
        }
        this.vueContext.color = val;
    }
};
