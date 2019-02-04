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
        vkey:     { type: String,   required: true },
        emitter:  { type: Object,   required: true },
        getData:  { type: Function, required: true },
        putData:  { type: Function, required: true },
        rowIdx:   { type: Number,   required: true },
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
