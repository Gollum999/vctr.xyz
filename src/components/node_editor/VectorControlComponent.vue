<template>
  <b-container class="vector-control-container">
    <b-form-row>
      <b-col>X</b-col>
      <b-col>Y</b-col>
      <b-col>Z</b-col>
    </b-form-row>
    <b-form-row>
      <b-col><input v-if="value" type="number" v-model.number="value[0]" :readonly="readOnly" @input="update" /></b-col>
      <b-col><input v-if="value" type="number" v-model.number="value[1]" :readonly="readOnly" @input="update" /></b-col>
      <b-col><input v-if="value" type="number" v-model.number="value[2]" :readonly="readOnly" @input="update" /></b-col>
    </b-form-row>
  </b-container>
</template>

<script>
import { vec3 } from 'gl-matrix';

export default {
    props: [
        'vkey', 'emitter', 'getData', 'putData', // required
        'readOnly',
    ],

    data() {
        return {
            value: vec3.create(),
        };
    },

    methods: {
        update() {
            if (this.vkey) {
                console.log(`VectorControlComponent putData key: ${this.vkey} value: ${this.value} type: ${typeof this.value}`);
                this.putData(this.vkey, this.value);
            }
            console.log('VectorControlComponent triggering process');
            this.emitter.trigger('process');
        },
    },

    mounted() {
        console.log(`VectorControlComponent mounted`);
        console.log(this);
        this.value = this.getData(this.vkey);
        console.log(`mounted set value for key ${this.vkey} to ${this.value}`);
    },
};
</script>

<style>
.vector input {
    width: 3em;
}
</style>
