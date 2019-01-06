<template>
<div class="vector-control-container" :style="{'grid-row': rowIdx}">
  <input v-if="value" type="number" v-model.number="value[0]" :readonly="readOnly" @input="update" />
  <input v-if="value" type="number" v-model.number="value[1]" :readonly="readOnly" @input="update" />
  <input v-if="value" type="number" v-model.number="value[2]" :readonly="readOnly" @input="update" />
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
    props: [
        'vkey', 'emitter', 'getData', 'putData', // required
        'readOnly', 'rowIdx',
    ],

    data() {
        return {
            value: vec3.create(),
        };
    },

    methods: {
        update() {
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
        console.log(`mounted set value for key ${this.vkey} to ${this.value}`);
    },
};
</script>

<style>
.vector-control-container {
    grid-column: controls;
    display: flex;
}
.vector-input input {
    width: 3em;
}
.vector-output input {
    width: 3em;
}
#app .node.vector-input .title {
    background-color: #5f5fb9;
    border-radius: 10px 10px 0 0;
}
#app .node.vector-output .title {
    background-color: #3fb73f;
    border-radius: 10px 10px 0 0;
}
</style>
