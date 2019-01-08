<template>
  <div class="color-control-container">
    <div class="color-label input-title" :style="{'grid-row': rowIdx}">Color</div>
    <div class="color-picker" :style="{'grid-row': rowIdx}"></div>
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
.color-control-container {
    display: contents;
}
.color-label {
    /* TODO use socket label style */
    grid-column: inputs;
}
.color-picker {
    grid-column: controls;
    width: 1.4em;
    height: 1.4em;
    background-color: yellow;
    border: 1px solid lightgray;
    margin: 0.5em;
}
</style>
