<template>
<div class="dimensions-label-container" :style="{'grid-row': rowIdx}">
  <div class="label-column" v-for="axis in axes" :key="`label-column-${axis}`">{{axis.toUpperCase()}}</div>
</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import type { Emitter } from 'rete/types/core/emitter';
import type { EventsTypes as DefaultEvents } from 'rete/types/events';
import type { EventsTypes as CoreEvents } from 'rete/types/core/events';

export default Vue.extend({
    props: {
        getData: { type: Function as PropType<(key: string) => any>,              required: true }, // injected by Rete
        putData: { type: Function as PropType<(key: string, val: any) => void>,   required: true }, // injected by Rete
        emitter: { type: Object as PropType<Emitter<DefaultEvents & CoreEvents>>, required: true },
        dataKey: { type: String,                                                  required: true },
        rowIdx:  { type: Number,                                                  required: true }, // used to position control within parent grid
        axes:    { type: Array as PropType<Array<string>>,                        required: true }, // list of labels to display
    },
});
</script>

<style scoped>
.dimensions-label-container {
    margin: 2px 4px;
    display: flex;
    grid-column: controls;
}
.label-column {
    width: 33%;
}
</style>
