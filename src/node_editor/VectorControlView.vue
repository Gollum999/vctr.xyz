<template>
<div class="vector-control-container" :style="{'grid-row': rowIdx}">
  <md-field v-for="(axis, idx) in values" :key="idx">
    <md-input
      type="number"
      :value="axis.val"
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

const DEFAULT_VECTOR_WRAPPER = Object.freeze([{val: 0}, {val: 0}, {val: 0}]);

function vectorWrapperToArray(vec) {
    return vec.map(axis => axis.val);
}

function arrayToVectorWrapper(array) {
    return array.map(i => { return {val: i}; });
}

export default {
    props: {
        getData:  { type: Function, required: true },
        putData:  { type: Function, required: true },
        emitter:  { type: Object,   required: true }, // injected by Rete
        dataKey:  { type: String,   required: true }, // injected by Rete
        rowIdx:   { type: Number,   required: true }, // used to position control within parent grid
    },

    data() {
        return {
            // To make everything properly reactive, must use proxy array instead of raw vec3, and must wrap array elements in objects
            values: DEFAULT_VECTOR_WRAPPER.slice(),
            readOnly: false,
        };
    },

    watch: {
        values: {
            handler: function (newVal, oldVal) {
                console.log('VectorControlView value watcher, calling putData', this.dataKey, this.values, newVal, oldVal);
                if (this.dataKey) {
                    /* console.log('VectorControlView putData key:', this.dataKey, 'values:', this.values, vectorWrapperToArray(this.values)); */
                    this.putData(this.dataKey, vectorWrapperToArray(this.values));
                    console.log(this);
                }
            },
            deep: true,
        },
    },

    methods: {
        setValue(value) {
            // console.log('VectorControlView setValue', value);
            // TODO repeat this check for other types
            if (_.isNil(value) || value.length !== 3) {
                this.values = DEFAULT_VECTOR_WRAPPER.slice();
                // console.log('VectorControlView setValue DEFAULT to', this.values);
            } else {
                this.values = arrayToVectorWrapper(value);
                // console.log('VectorControlView setValue from array to', this.values);
            }
        },

        onChange(event, idx) {
            /* console.log('VectorControlView onChange old values:', this.values, this.values[0].val, this.values[1].val, this.values[2].val); */
            const newValues = this.values.map(i => ({...i})); // Make sure to deep copy the wrappers
            newValues[idx].val = parseFloat(event.target.value);
            /* console.log('VectorControlView onChange new values:', newValues, newValues[0].val, newValues[1].val, newValues[2].val); */
            console.log('VectorControlView onChange', event, idx, this.values, newValues);
            this.emitter.trigger('addhistory', new FieldChangeAction(this.values, newValues, val => { this.values = val; }));
            this.values = newValues;

            console.log('VectorControlView triggering engine process from onChange');
            this.emitter.trigger('process');
        },

        onCopy(event) {
            const valueArray = vectorWrapperToArray(this.values);
            const text = valueArray.join(', ');
            console.log('VectorControlView onCopy', event, valueArray, 'setting clipboard to "', text, '"');
            event.clipboardData.setData('text', text);
        },

        onPaste(idx, event) {
            if (this.readOnly) {
                return;
            }
            console.log(`VectorControlView onPaste ${idx}`, event);
            const text = event.clipboardData.getData('text');
            const split = text.split(/[ ,;]+/);
            // TODO consider falling back to default paste handler if split is wrong length (so pasting single numbers appends instead of overwrites selected cell)
            const result = vectorWrapperToArray(this.values);
            for (let offset = 0; idx + offset < 3 && offset < split.length; ++offset) {
                result[idx + offset] = parseFloat(split[offset]);
            }
            this.setValue(result);
        },
    },

    mounted() {
        const data = this.getData(this.dataKey);
        // console.log('VectorControlView mounted, data = ', data);
        this.setValue(data);
        // console.log('VectorControlView mounted, set this.values to ', this.values);
    },
};
</script>

<style scoped>
.vector-control-container {
    margin: 2px 4px;
    grid-column: controls;
    display: flex;
}
.vector input {
    width: 3em;
}
#app .node.vector .title {
    /* background-color: #5f5fb9; */
    /* border-radius: 10px 10px 0 0; */
}
#app .node.vector .title {
    /* background-color: #3fb73f; */
    /* border-radius: 10px 10px 0 0; */
}
</style>
