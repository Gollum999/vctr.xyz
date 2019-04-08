<template>
<md-field><md-input type="number" v-model.number="value" :readonly="readOnly" /></md-field>
</template>

<script>
export default {
    props: {
        getData:  { type: Function, required: true },
        putData:  { type: Function, required: true },
        emitter:  { type: Object,   required: true }, // injected by Rete
        dataKey:  { type: String,   required: true }, // injected by Rete
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
            console.log(`ScalarControlView value watcher, calling updateData ${this.dataKey} ${this.value}`);
            this.updateData(); // TODO Careful of infinite recursion here...
        },
    },

    methods: {
        updateData() {
            console.log(`ScalarControlView updateData() ${this.dataKey} ${this.value}`);
            if (this.dataKey) {
                this.putData(this.dataKey, this.value);
            }
            this.emitter.trigger('process');
        },
    },

    mounted() {
        this.value = this.getData(this.dataKey);
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
