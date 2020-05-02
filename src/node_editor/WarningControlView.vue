<template>
<div class="warning-icon" :style="{visibility: warningMsg ? 'visible' : 'hidden'}" :title="`Error: ${warningMsg}`">
  <v-icon color="red" large>warning</v-icon>
</div>
</template>

<script>
export default {
    props: {
        getData:       { type: Function, required: true }, // injected by Rete
        putData:       { type: Function, required: true }, // injected by Rete
        emitter:       { type: Object,   required: true }, // injected by Rete
        dataKey:       { type: String,   required: true }, // injected by Rete
        rowIdx:        { type: Number,   required: true }, // used to position control within parent grid
    },

    data() {
        return {
            warningMsg: '',
        };
    },
};
</script>

<style scoped>
</style>
