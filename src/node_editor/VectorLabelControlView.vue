<template>
<div class="vector-label-container" :style="{'grid-row': rowIdx}">
  <div class="label-column">X</div>
  <div class="label-column">Y</div>
  <div class="label-column">Z</div>
</div>
</template>

<script>
export default {
    props: [
        'vkey', 'emitter', 'getData', 'putData', // required
        'rowIdx',
    ],
};
</script>

<style scoped>
.vector-label-container {
    display: flex;
    grid-column: controls;
}
.label-column {
    width: 33%;
}
</style>
