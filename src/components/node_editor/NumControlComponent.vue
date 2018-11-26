<template>
  <input type="number" v-model.number="value" :readonly="readonly" @input="update" />
</template>

<script>
export default {
    props: [
        'vkey', 'emitter', 'getData', 'putData', // required
        'readonly',
    ],

    data() {
        return {
            value: 0,
        };
    },

    methods: {
        /* onChange(event) {
         *     this.value = parseInt(event.target.value);
         *     console.log(`set value to ${this.value} (${typeof this.value})`);
         *     this.update();
         * }, */
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
.number input {
    /* Smaller default size but stretch to fill */
    width: 5em;
    min-width: 100%;
}
.add input {
    width: 5em;
    min-width: 100%;
}
</style>
