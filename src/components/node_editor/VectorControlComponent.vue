<template>
  <b-container class="vector-control-container">
    <b-row>
      <b-col>X</b-col>
      <b-col>Y</b-col>
      <b-col>Z</b-col>
    </b-row>
    <b-row>
      <b-col><input type="number" :value="value[0]" :readonly="readonly" @input="onChange($event, 0)" /></b-col>
      <b-col><input type="number" :value="value[1]" :readonly="readonly" @input="onChange($event, 1)" /></b-col>
      <b-col><input type="number" :value="value[2]" :readonly="readonly" @input="onChange($event, 2)" /></b-col>
    </b-row>
  </b-container>
</template>

<script>
import { vec3 } from 'gl-matrix';

export default {
    props: [
        'vkey', 'emitter', 'getData', 'putData', // required
        'readonly',
    ],

    data() {
        return {
            value: vec3.create(),
        };
    },

    methods: {
        onChange(event, idx) {
            this.value[idx] = +event.target.value;
            console.log(`set value[${idx}] to ${this.value} (${typeof this.value})`);
            this.update();
        },
        update() {
            if (this.vkey) {
                console.log(`NumControlComponent putData key: ${this.vkey} value: ${this.value} type: ${typeof this.value}`);
                this.putData(this.vkey, this.value);
            }
            console.log('NumControlComponent triggering process');
            this.emitter.trigger('process');
        },
    },

    mounted() {
        console.log('NumControlComponent mounted');
        console.log(this);
        this.value = this.getData(this.vkey);
        console.log(`mounted set value for key ${this.vkey} to ${this.value}`);
    },
};
</script>

<style>
.vector input {
    width: 40px;
}
</style>
