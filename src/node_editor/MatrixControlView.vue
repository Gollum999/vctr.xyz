<template>
<div class="matrix-control-container" :style="{'grid-row': rowIdx}">
  <md-field v-for="(item, idx) in values" :key="`matrix-value-${idx}`">
    <md-input
      type="number"
      :value="item.val"
      :readonly="readOnly"
      @change="onChange($event, idx)"
      @copy.prevent.stop="onCopy"
      @paste.prevent.stop="onPaste(idx, $event)"
    />
  </md-field>
</div>

<!-- <template v-if="readOnly"> -->
<!--   <label v-b-toggle.display-options>Display options</label> -->
<!--   <b-collapse id="display-options"> -->
<!--     <p> -->
<!--       this is a test -->
<!--     </p> -->
<!--   </b-collapse> -->
<!-- </template> -->
</template>

<script>
import _ from 'lodash';
import { FieldChangeAction } from './util';

const DEFAULT_MATRIX_WRAPPER = Object.freeze([
    {val: 1}, {val: 0}, {val: 0}, {val: 0},
    {val: 0}, {val: 1}, {val: 0}, {val: 0},
    {val: 0}, {val: 0}, {val: 1}, {val: 0},
    {val: 0}, {val: 0}, {val: 0}, {val: 1},
]);

function matrixWrapperToArray(mat) {
    return mat.map(item => item.val);
}

function arrayToMatrixWrapper(array) {
    return array.map(i => { return {val: i}; });
}

export default {
    props: {
        getData:  { type: Function, required: true }, // injected by Rete
        putData:  { type: Function, required: true }, // injected by Rete
        emitter:  { type: Object,   required: true },
        dataKey:  { type: String,   required: true },
        rowIdx:   { type: Number,   required: true }, // used to position control within parent grid
    },

    data() {
        return {
            // To make everything properly reactive, must use proxy array instead of raw mat4, and must wrap array elements in objects
            values: DEFAULT_MATRIX_WRAPPER.slice(),
            readOnly: false,
        };
    },

    watch: {
        values: {
            handler: function (newVal, oldVal) {
                /* console.log('MatrixControlView value watcher, calling putData', this.dataKey, this.values, newVal, oldVal); */
                if (this.dataKey) {
                    /* console.log('MatrixControlView putData key:', this.dataKey, 'values:', this.values, matrixWrapperToArray(this.values)); */
                    this.putData(this.dataKey, matrixWrapperToArray(this.values));
                }
            },
            deep: true,
        },
    },

    methods: {
        setValue(value) {
            // console.log('MatrixControlView setValue', value);
            // TODO repeat this check for other types
            if (_.isNil(value) || value.length !== 16) {
                this.values = DEFAULT_MATRIX_WRAPPER.slice();
                // console.log('MatrixControlView setValue DEFAULT to', this.values);
            } else {
                this.values = arrayToMatrixWrapper(value);
                // console.log('MatrixControlView setValue from array to', this.values);
            }
        },

        onChange(event, idx) {
            /* console.log('MatrixControlView onChange old values:', this.values); */
            const newValues = this.values.map(i => ({...i})); // Make sure to deep copy the wrappers
            newValues[idx].val = parseFloat(event.target.value);
            /* console.log('MatrixControlView onChange new values:', newValues); */
            /* console.log('MatrixControlView adding history', event, idx, this.values, newValues); */
            this.emitter.trigger('addhistory', new FieldChangeAction(this.values, newValues, val => { this.values = val; }));
            this.values = newValues;

            /* console.log('MatrixControlView triggering engine process from onChange'); */
            this.emitter.trigger('process');
        },

        onCopy(event) {
            const valueArray = matrixWrapperToArray(this.values);
            const text = valueArray.join(', '); // TODO what delimiters to use?
            console.log('MatrixControlView onCopy', event, valueArray, 'setting clipboard to "', text, '"');
            event.clipboardData.setData('text', text);
        },

        onPaste(idx, event) {
            // TODO should I paste "visually"?  e.g. if you paste into middle cell, shift pasted values over (no wrapping)?
            // TODO should I support the shifting at all, or always paste whole matrix?
            if (this.readOnly) {
                return;
            }
            console.log(`MatrixControlView onPaste ${idx}`, event);
            const text = event.clipboardData.getData('text');
            const split = text.split(/[ ,;]+/);
            // TODO consider falling back to default paste handler if split is wrong length (so pasting single numbers appends instead of overwrites selected cell)
            const result = matrixWrapperToArray(this.values);
            for (let offset = 0; idx + offset < 16 && offset < split.length; ++offset) {
                result[idx + offset] = parseFloat(split[offset]);
            }
            this.setValue(result);
        },
    },

    mounted() {
        this.setValue(this.getData(this.dataKey));
    },
};
</script>

<style scoped>
.matrix-control-container {
    margin: 2px 4px;
    grid-column: controls;
    display: grid;
    grid-template-columns: auto auto auto auto;
    grid-template-rows: auto auto auto auto;
}
.matrix input {
    width: 3em;
}
#app .node.matrix .title {
    /* background-color: #5f5fb9; */
    /* border-radius: 10px 10px 0 0; */
}
#app .node.matrix .title {
    /* background-color: #3fb73f; */
    /* border-radius: 10px 10px 0 0; */
}
</style>
