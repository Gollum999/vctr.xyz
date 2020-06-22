<template>
<div class="warning-icon" :style="{visibility: warningMsg ? 'visible' : 'hidden'}" :title="`Error: ${warningMsg}`">
  <v-icon color="red" large>warning</v-icon>
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
    },

    data() {
        return {
            warningMsg: '',
        };
    },
});
</script>

<style scoped>
</style>
