<template>
<div class="vector-operation-component">
  <md-field>
    <md-select md-dense v-model="selected" @input="update">
      <md-option v-for="option in options" :key="option" :value="option">{{option}}</md-option>
    </md-select>
  </md-field>
</div>
</template>

<script>
export default {
    props: {
        vkey:     { type: String,   required: true }, // injected by Rete
        emitter:  { type: Object,   required: true }, // injected by Rete
        getData:  { type: Function, required: true }, // injected by Rete
        putData:  { type: Function, required: true }, // injected by Rete
    },

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
            console.log(`VectorOperationControlView update:`);
            if (this.vkey) {
                console.log(`VectorOperationControlView putData key: ${this.vkey} selected: ${this.selected} type: ${typeof this.selected}`);
                this.putData(this.vkey, this.selected);
            }
            this.emitter.trigger('process');
        },
    },

    mounted() {
        this.selected = this.getData(this.vkey) || 'Add'; // TODO was this mentioned somewhere in the docs?
    },
};
</script>

<style scoped>
.vector-operation-component {
    margin: 2px 4px;
}
</style>

<style>
#app .vector-operation-component input {
    width: 5em;
}
</style>
