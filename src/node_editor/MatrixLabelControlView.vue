<template>
<div class="matrix-label-container" :style="{'grid-row': rowIdx}">
  <div class="label-column">X</div>
  <div class="label-column">Y</div>
  <div class="label-column">Z</div>
  <div class="label-column">W</div>
</div>
</template>

<script>
export default {
    props: {
        getData:  { type: Function, required: true }, // injected by Rete
        putData:  { type: Function, required: true }, // injected by Rete
        emitter:  { type: Object,   required: true },
        dataKey:  { type: String,   required: true },
        rowIdx:   { type: Number,   required: true }, // used to position control within parent grid
    },
};
</script>

<style scoped>
.matrix-label-container {
    margin: 2px 4px;
    display: flex;
    grid-column: controls;
}
.label-column {
    width: 33%;
}
</style>
