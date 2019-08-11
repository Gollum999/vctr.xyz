<template>
<!-- TODO why is dark theme not applying? -->
<v-text-field solo dark hide-details type="number" :value="value" :readonly="readOnly" @change="onChange" />
</template>

<script>
import { FieldChangeAction } from './util';

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
        value(newVal, oldVal) {
            /* console.log('ScalarControlView value watcher, calling updateData', this.dataKey, this.value, newVal, oldVal); */
            // TODO don't want to call this when undoing...
            /* this.emitter.trigger('addhistory', new FieldChangeAction(oldVal, newVal, val => { this.value = val; })); */
            /* console.log(`ScalarControlView updateData() ${this.dataKey} ${this.value}`); */
            if (this.dataKey) {
                this.putData(this.dataKey, this.value);
            }
            this.emitter.trigger('process');
        },
    },

    methods: {
        onChange(event) {
            /* console.log('onChange', this.value, typeof this.value, event); */
            const value = parseFloat(event.target.value);
            this.emitter.trigger('addhistory', new FieldChangeAction(this.value, value, val => { this.value = val; }));
            this.value = value;
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
</style>

<style>
#app .scalar input {
    width: 2em;
    padding: 0;
}
#app .scalar .v-input {
    margin: inherit;
    padding: 0px 4px;
}
#app .scalar .v-input__slot {
    padding: 0px 6px;
    background-color: rgba(255, 255, 255, 0.05);
}
#app .scalar .v-input__control {
    min-height: 28px;
}
</style>
