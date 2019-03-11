<template>
<div class="matrix-control-container" :style="{'grid-row': rowIdx}">
  <template class="matrix-grid-row" v-for="i in 4">
    <template class="matrix-grid-col" v-for="j in 4">
      <md-field :key="`matrix-value-${i}-${j}`">
        <md-input type="number" v-model.number="value[i-1][j-1]" :readonly="readOnly" @input="updateData" />
      </md-field>
    </template>
  </template>
</div>

<!-- <template v-if="readOnly"> -->
<!--   <label v-b-toggle.display-options>Display options</label> -->
<!--   <b-collapse id="display-options"> -->
<!--     <p> -->
<!--       this is a test -->
<!--     </p> -->
<!--   </b-collapse> -->
<!-- </template> -->
</template>

<script>
import { mat4 } from 'gl-matrix';

export default {
    props: {
        vkey:     { type: String,   required: true }, // injected by Rete
        emitter:  { type: Object,   required: true }, // injected by Rete
        getData:  { type: Function, required: true }, // injected by Rete
        putData:  { type: Function, required: true }, // injected by Rete
        rowIdx:   { type: Number,   required: true }, // used to position control within parent grid
    },

    data() {
        return {
            value: mat4.create(),
            readOnly: false,
        };
    },

    methods: {
        updateData() {
            console.log('MatrixControlView updateData');
            if (this.vkey) {
                console.log(`MatrixControlView putData key: ${this.vkey} value: ${this.value} type: ${typeof this.value}`);
                this.putData(this.vkey, this.value);
            }
            this.emitter.trigger('process');
        },
    },

    mounted() {
        this.value = this.getData(this.vkey);
    },
};
</script>

<style scoped>
.matrix-control-container {
    margin: 2px 4px;
    grid-column: controls;
    display: grid;
    grid-template-columns: auto auto auto auto;
    grid-template-rows: auto auto auto auto;
}
.matrix input {
    width: 3em;
}
.matrix-grid-row {
}
#app .node.matrix .title {
    /* background-color: #5f5fb9; */
    /* border-radius: 10px 10px 0 0; */
}
#app .node.matrix .title {
    /* background-color: #3fb73f; */
    /* border-radius: 10px 10px 0 0; */
}
</style>
