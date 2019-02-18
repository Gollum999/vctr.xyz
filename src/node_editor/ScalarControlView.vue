<template>
<md-field><md-input type="number" v-model.number="value" :readonly="readOnly" /></md-field>
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
            value: 0,
            readOnly: false,
        };
    },

    watch: {
        // TODO I think this is the more correct way to handle this (rather than using @input) to avoid duplicate callbacks; use this pattern everywhere?
        value() {
            console.log(`ScalarControlView value watcher, calling updateData ${this.vkey} ${this.value}`);
            this.updateData(); // TODO Careful of infinite recursion here...
        },
    },

    methods: {
        updateData() {
            console.log(`ScalarControlView updateData() ${this.vkey} ${this.value}`);
            if (this.vkey) {
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
.scalar .md-input {
    /* Smaller default size but stretch to fill */
    width: 3em;
    min-width: 100%;
}
.add---old .md-input {
    width: 3em;
    min-width: 100%;
}
</style>
