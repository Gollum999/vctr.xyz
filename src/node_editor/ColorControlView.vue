<template>
<div class="color-control-container">
  <div class="color-control-container-inner" :style="{'grid-row': rowIdx}" >
    <color-picker-button class="color-picker" v-model="color" :disabled="!visible" @color-picker-toggled="colorPickerToggled" />

    <v-checkbox dark color="white" class="visible-checkbox" v-model="visible" on-icon="mdi-eye" off-icon="mdi-eye-off"
                hide-details :ripple="false" />
  </div>
</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import type { Emitter } from 'rete/types/core/emitter';
import type { EventsTypes as DefaultEvents } from 'rete/types/events';
import type { EventsTypes as CoreEvents } from 'rete/types/core/events';

import { EventBus } from '../EventBus';
import { FieldChangeAction } from '../history_actions';
import ColorPickerButton from '../ColorPickerButton.vue';
import history from '../history';

export default Vue.extend({
    components: {
        'color-picker-button': ColorPickerButton,
    },

    props: {
        getData: { type: Function as PropType<(key: string) => any>,              required: true }, // injected by Rete
        putData: { type: Function as PropType<(key: string, val: any) => void>,   required: true }, // injected by Rete
        emitter: { type: Object as PropType<Emitter<DefaultEvents & CoreEvents>>, required: true },
        dataKey: { type: String,                                                  required: true },
        rowIdx:  { type: Number,                                                  required: true }, // used to position control within parent grid
    },

    data() {
        return {
            visible: null as boolean | null,
            color: null as string | null,
            prevColor: null as string | null,
        };
    },

    watch: {
        colorPickerShowing(showing: boolean) {
            /* console.log('colorPickerShowing CHANGED', showing, this.color); */
            if (showing) {
                /* console.log('colorPicker opened', this.color, this.prevColor); */
                this.prevColor = Object.assign({}, this.color);
            } else {
                // console.log('colorPicker closed, emitting history', this.color, this.prevColor);
                history.add(new FieldChangeAction(this.prevColor, this.color, (color) => { this.color = color; }));
            }
        },
        visible(newVal: boolean, oldVal: boolean) {
            if (oldVal === null) {
                return; // Avoid triggering history when first loading node
            }
            if (this.dataKey) {
                this.putData(this.dataKey, this.makeData(newVal, this.color));
            }
            // console.log('colorPicker visible changed, emitting history', newVal);
            history.add(new FieldChangeAction(oldVal, newVal, (visible) => { this.visible = visible; }));

            // TODO the reactivity is nice, but will get very laggy if there is any mildly complex logic.  since the color has no effect on any other state, could just use a separate "re-render but don't process everything" event
            //      but we *have* to process if we want to keep color/visible in data, since we look at data to determine how to render
            this.emitter.trigger('process');
        },
        color: {
            deep: true,
            handler(newVal: string, oldVal: string) {
                if (oldVal === null) {
                    return; // Avoid triggering history when first loading node
                }
                /* console.log('color watcher', this.dataKey, this.color, oldVal, newVal); */
                if (this.dataKey) {
                    this.putData(this.dataKey, this.makeData(this.visible, newVal));
                }

                // TODO the reactivity is nice, but will get very laggy if there is any mildly complex logic.  since the color has no effect on any other state, could just use a separate "re-render but don't process everything" event
                //      but we *have* to process if we want to keep color/visible in data, since we look at data to determine how to render
                this.emitter.trigger('process');
            },
        },
    },

    mounted() {
        /* console.log('ColorControlView MOUNTED', this.color, this.getData(this.dataKey)); */
        if (!this.dataKey) {
            throw new Error('dataKey was null??');
        }
        const data = this.getData(this.dataKey) || { visible: true, color: '#000000' };
        this.color = data.color; // TODO breaking this out to make sure I have reactivity; is there a better way?
        this.visible = data.visible;

        /* console.log('ColorControlView mounted', this.dataKey, this.color); */
        this.putData(this.dataKey, this.makeData(this.visible, this.color));
    },

    methods: {
        makeData(visible: boolean | null, color: string | null) {
            return {
                visible,
                color,
            };
        },
        colorPickerToggled(showing: boolean) {
            if (showing) {
                /* console.log('colorPicker opened', this.color, this.prevColor); */
                this.prevColor = this.color;
            } else {
                // console.log('colorPicker toggled, emitting history', showing, this.color, this.prevColor);
                history.add(new FieldChangeAction(this.prevColor, this.color, (color) => { this.color = color; }));
            }
        },
    },
});
</script>

<style scoped>
.color-control-container {
    display: contents;
}
.color-control-container-inner {
    grid-column: controls;
    display: flex;
    align-items: center;
}
.visible-checkbox {
    /* grid-column: controls; */
    display: inline-block;
    margin-top: 0;
    padding-top: 0;
}
</style>

<style>
.color-picker-button {
    width: 1.4em;
    height: 1.4em;
    margin: 0.5em;
}
</style>
