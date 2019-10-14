<template>
<div :class="[valueType, 'control-container']" :style="{'grid-row': rowIdx}">
  <!-- TODO why is dark theme not applying to font color? -->
  <v-text-field
    v-for="(item, idx) in values" :key="`${valueType}-value-${idx}`"
    solo
    dark
    hide-details
    type="number"
    :value="item.val"
    :readonly="readOnly"
    @input="onInput($event, idx)"
    @copy.prevent.stop="onCopy"
    @paste.prevent.stop="onPaste(idx, $event)"
  />
</div>
</template>

<script>
import _ from 'lodash';
import { FieldChangeAction } from '../util';
import { ValueType } from './node_util';

const DEFAULT_SCALAR_WRAPPER = Object.freeze([{val: 1}]);
const DEFAULT_VECTOR_WRAPPER = Object.freeze([{val: 1}, {val: 1}, {val: 1}]);
const DEFAULT_MATRIX_WRAPPER = Object.freeze([
    {val: 1}, {val: 0}, {val: 0}, {val: 0},
    {val: 0}, {val: 1}, {val: 0}, {val: 0},
    {val: 0}, {val: 0}, {val: 1}, {val: 0},
    {val: 0}, {val: 0}, {val: 0}, {val: 1},
]);

const EXPECTED_SIZE = {
    [ValueType.SCALAR]: 1,
    [ValueType.VECTOR]: 3,
    [ValueType.MATRIX]: 16,
};

function wrapperToArray(wrapper) {
    return wrapper.map(axis => axis.val);
}

function arrayToWrapper(array) {
    return array.map(i => { return {val: i}; });
}

export default {
    props: {
        getData:       { type: Function, required: true },
        putData:       { type: Function, required: true },
        emitter:       { type: Object,   required: true }, // injected by Rete
        dataKey:       { type: String,   required: true }, // injected by Rete
        globalVuetify: { type: Object,   required: true },
        rowIdx:        { type: Number,   required: true }, // used to position control within parent grid
        valueType:     { type: String,   required: true, validator: value => Object.values(ValueType).includes(value) },
    },

    data() {
        // To make everything properly reactive, must use proxy array instead of raw vec3/mat4, and must wrap array elements in objects
        // Scalars don't actually need this, but just follow the pattern for consistency
        const defaultValues = {
            [ValueType.SCALAR]: DEFAULT_SCALAR_WRAPPER,
            [ValueType.VECTOR]: DEFAULT_VECTOR_WRAPPER,
            [ValueType.MATRIX]: DEFAULT_MATRIX_WRAPPER,
        }[this.valueType];
        return {
            defaultValues: defaultValues,
            values: defaultValues.slice(),
            readOnly: false,
        };
    },

    created() {
        // HACK: There is some bug when using Vuetify in local Vue contexts that causes certain components to break
        // https://github.com/retejs/vue-render-plugin/issues/14
        this.$vuetify = this.globalVuetify;
    },

    watch: {
        values: {
            handler: function (newVal, oldVal) {
                /* console.log('ValueControlView value watcher, calling putData', this.dataKey, this.values, newVal, oldVal); */
                if (this.dataKey) {
                    /* console.log('ValueControlView putData key:', this.dataKey, 'values:', this.values, wrapperToArray(this.values)); */
                    this.putData(this.dataKey, wrapperToArray(this.values));
                    /* console.log(this); */
                }
            },
            deep: true,
        },
    },

    methods: {
        setValue(value) {
            // console.log('ValueControlView setValue', value);
            // TODO repeat this check for other types
            if (_.isNil(value) || value.length !== EXPECTED_SIZE[this.valueType]) {
                this.values = this.defaultValues.slice();
                // console.log('ValueControlView setValue DEFAULT to', this.values);
            } else {
                this.values = arrayToWrapper(value);
                // console.log('ValueControlView setValue from array to', this.values);
            }
        },

        onInput(newValue, idx) {
            /* console.log('ValueControlView onInput old values:', this.values); */
            const newValues = this.values.map(i => ({...i})); // Make sure to deep copy the wrappers
            newValues[idx].val = parseFloat(newValue);
            /* console.log('ValueControlView onInput new values:', newValues); */
            /* console.log('ValueControlView onInput', newValue, idx, this.values, newValues); */
            this.emitter.trigger('addhistory', new FieldChangeAction(this.values, newValues, val => { this.values = val; }));
            this.values = newValues;

            console.log('ValueControlView', this.valueType, 'triggering engine process from onInput');
            this.emitter.trigger('process');
        },

        onCopy(event) {
            const valueArray = wrapperToArray(this.values);
            const text = valueArray.join(', '); // TODO what delimiters to use?
            console.log('ValueControlView onCopy', event, valueArray, 'setting clipboard to "', text, '"');
            event.clipboardData.setData('text', text);
        },

        onPaste(idx, event) {
            // TODO should I paste "visually"?  e.g. if you paste into middle cell, shift pasted values over (no wrapping)?
            // TODO should I support the shifting at all, or always paste whole thing?
            // TODO   possibly useful for vectors, but probably just confusing for matrices
            if (this.readOnly) {
                return;
            }
            console.log(`ValueControlView onPaste ${idx}`, event);
            const text = event.clipboardData.getData('text');
            const split = text.split(/[ ,;]+/);
            // TODO consider falling back to default paste handler if split is wrong length (so pasting single numbers appends instead of overwrites selected cell)
            const result = wrapperToArray(this.values);
            for (let offset = 0; idx + offset < EXPECTED_SIZE[this.valueType] && offset < split.length; ++offset) {
                result[idx + offset] = parseFloat(split[offset]);
            }
            this.setValue(result);
        },
    },

    mounted() {
        const data = this.getData(this.dataKey);
        // console.log('ValueControlView mounted, data = ', data);
        this.setValue(data);
        // console.log('ValueControlView mounted, set this.values to ', this.values);
    },
};
</script>

<style scoped>
.control-container {
    margin-right: 8px;
    grid-column: controls;
    display: flex;
}
.control-container.matrix {
    display: grid;
    grid-template-columns: auto auto auto auto;
    grid-template-rows: auto auto auto auto;
}
</style>

<style>
#app .control-container input {
    width: 3em;
    padding: 0;
}
#app .control-container .v-input {
    padding: 0px 6px; /* This must include the .v-input__slot padding to avoid overlap */
}
#app .control-container.matrix .v-input {
    padding: 2px 6px; /* This must include the .v-input__slot padding to avoid overlap */
}
#app .control-container .v-input__slot {
    padding: 0px 4px; /* This is the padding between the container bounds and the actual contained input */
    background-color: rgba(255, 255, 255, 0.05);
}
#app .control-container .v-input__control {
    min-height: 28px;
}
</style>