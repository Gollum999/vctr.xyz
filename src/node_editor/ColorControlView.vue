<template>
  <div class="color-control-container">
    <div class="color-label input-title" :style="{'grid-row': rowIdx}">Color</div>
    <div class="color-picker" :style="{'grid-row': rowIdx}"></div>
  </div>
</template>

<script>
export default {
    props: {
        vkey:    { type: String,   required: true },
        emitter: { type: Object,   required: true },
        getData: { type: Function, required: true },
        putData: { type: Function, required: true },
        rowIdx:  { type: Number,   required: true },
    },
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
