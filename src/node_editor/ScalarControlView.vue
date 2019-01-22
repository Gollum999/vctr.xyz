<template>
  <md-field><md-input type="number" v-model.number="value" :readonly="readonly" @input="update" /></md-field>
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
        update() {
            if (this.vkey) {
                console.log(`ScalarControlView putData key: ${this.vkey} value: ${this.value} type: ${typeof this.value}`);
                this.putData(this.vkey, this.value);
            }
            console.log('ScalarControlView triggering process');
            this.emitter.trigger('process');
        },
    },

    mounted() {
        console.log('ScalarControlView mounted');
        console.log(this);
        this.value = this.getData(this.vkey);
        console.log(`mounted set value for key ${this.vkey} to ${this.value}`);
    },
};
</script>

<style scoped>
.scalar .md-input {
    /* Smaller default size but stretch to fill */
    width: 3em;
    min-width: 100%;
}
.add .md-input {
    width: 3em;
    min-width: 100%;
}
</style>
