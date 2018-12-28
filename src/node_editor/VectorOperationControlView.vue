<template>
  <div class="vector-operation-component">
    <b-form-select v-model="selected" :options="options" class="mb-3" @input="update" />
  </div>
</template>

<script>
export default {
    props: [
        'vkey', 'emitter', 'getData', 'putData', // required
    ],

    data() {
        return {
            selected: null,
            options: [
                'Add',
                'Subtract',
                'Dot',
                'Cross',
            ],
        };
    },

    methods: {
        update() {
            /* console.log(`VectorOperationControlView update:`); */
            /* console.log(this.selected); */
            if (this.vkey) {
                console.log(`VectorOperationControlView putData key: ${this.vkey} selected: ${this.selected} type: ${typeof this.selected}`);
                this.putData(this.vkey, this.selected);
            }
            /* console.log('VectorOperationControlView triggering process'); */
            this.emitter.trigger('process');
        },
    },

    mounted() {
        /* console.log('VectorOperationControlView mounted'); */
        /* console.log(this); */
        /* console.log(this.selected); */
        this.selected = this.getData(this.vkey) || 'Add'; // TODO was this mentioned somewhere in the docs?
        console.log(`mounted set selected for key ${this.vkey} to ${this.selected}`);
    },
};
</script>

<style>
.vector-operation input {
    width: 10em;
}
</style>
