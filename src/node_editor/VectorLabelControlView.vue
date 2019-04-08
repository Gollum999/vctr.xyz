<template>
<div class="vector-label-container" :style="{'grid-row': rowIdx}">
  <div class="label-column">X</div>
  <div class="label-column">Y</div>
  <div class="label-column">Z</div>
</div>
</template>

<script>
export default {
    props: {
        getData:  { type: Function, required: true },
        putData:  { type: Function, required: true },
        emitter:  { type: Object,   required: true }, // injected by Rete
        dataKey:  { type: String,   required: true }, // injected by Rete
        rowIdx:   { type: Number,   required: true }, // used to position control within parent grid
    },
};
</script>

<style scoped>
.vector-label-container {
    margin: 2px 4px;
    display: flex;
    grid-column: controls;
}
.label-column {
    width: 33%;
}
</style>
