<template>
<div class="vector-control-container" :style="{'grid-row': rowIdx}">
  <md-field><md-input type="number" v-model.number="value[0]" :readonly="readOnly" @input="updateData" /></md-field>
  <md-field><md-input type="number" v-model.number="value[1]" :readonly="readOnly" @input="updateData" /></md-field>
  <md-field><md-input type="number" v-model.number="value[2]" :readonly="readOnly" @input="updateData" /></md-field>
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
import { vec3 } from 'gl-matrix';

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
            value: vec3.create(),
            readOnly: false,
        };
    },

    methods: {
        updateData() {
            console.log('VectorControlView updateData');
            if (this.vkey) {
                console.log(`VectorControlView putData key: ${this.vkey} value: ${this.value} type: ${typeof this.value}`);
                this.putData(this.vkey, this.value);
            }
            console.log('VectorControlView triggering process');
            this.emitter.trigger('process');
        },
    },

    mounted() {
        console.log(`VectorControlView mounted`);
        console.log(this);

        this.value = this.getData(this.vkey);
        console.log(`VectorControlView mounted set value for key ${this.vkey} to ${this.value}`);
    },
};
</script>

<style scoped>
.vector-control-container {
    margin: 2px 4px;
    grid-column: controls;
    display: flex;
}
.vector input {
    width: 3em;
}
#app .node.vector .title {
    /* background-color: #5f5fb9; */
    /* border-radius: 10px 10px 0 0; */
}
#app .node.vector .title {
    /* background-color: #3fb73f; */
    /* border-radius: 10px 10px 0 0; */
}
</style>
