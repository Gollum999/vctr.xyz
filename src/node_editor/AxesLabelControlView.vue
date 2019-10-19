<template>
<div class="dimensions-label-container" :style="{'grid-row': rowIdx}">
  <div class="label-column" v-for="axis in axes" :key="`label-column-${axis}`">{{axis | upper}}</div>
</div>
</template>

<script>
export default {
    props: {
        getData:  { type: Function, required: true }, // injected by Rete
        putData:  { type: Function, required: true }, // injected by Rete
        emitter:  { type: Object,   required: true }, // injected by Rete
        dataKey:  { type: String,   required: true }, // injected by Rete
        rowIdx:   { type: Number,   required: true }, // used to position control within parent grid
        axes:     { type: Array,    required: true }, // list of labels to display
    },
    filters: {
        upper: String.toUpperCase,
    },
};
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
