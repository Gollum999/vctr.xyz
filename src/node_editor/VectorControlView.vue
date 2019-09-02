<template>
<div class="vector-control-container" :style="{'grid-row': rowIdx}">
  <!-- TODO pull this out to reuse for all node types -->
  <!-- TODO why is dark theme not applying to font color? -->
  <v-text-field
    v-for="(axis, idx) in values" :key="idx"
    solo
    dark
    hide-details
    type="number"
    :value="axis.val"
    :readonly="readOnly"
    @input="onInput($event, idx)"
    @copy.prevent.stop="onCopy"
    @paste.prevent.stop="onPaste(idx, $event)"
  />
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
import { FieldChangeAction } from '../util';

const DEFAULT_VECTOR_WRAPPER = Object.freeze([{val: 0}, {val: 0}, {val: 0}]);

function vectorWrapperToArray(vec) {
    return vec.map(axis => axis.val);
}

function arrayToVectorWrapper(array) {
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
    },

    data() {
        return {
            // To make everything properly reactive, must use proxy array instead of raw vec3, and must wrap array elements in objects
            values: DEFAULT_VECTOR_WRAPPER.slice(),
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
                /* console.log('VectorControlView value watcher, calling putData', this.dataKey, this.values, newVal, oldVal); */
                if (this.dataKey) {
                    /* console.log('VectorControlView putData key:', this.dataKey, 'values:', this.values, vectorWrapperToArray(this.values)); */
                    this.putData(this.dataKey, vectorWrapperToArray(this.values));
                    /* console.log(this); */
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

        onInput(newValue, idx) {
            /* console.log('VectorControlView onInput old values:', this.values, this.values[0].val, this.values[1].val, this.values[2].val); */
            const newValues = this.values.map(i => ({...i})); // Make sure to deep copy the wrappers
            newValues[idx].val = parseFloat(newValue);
            /* console.log('VectorControlView onInput new values:', newValues, newValues[0].val, newValues[1].val, newValues[2].val); */
            /* console.log('VectorControlView onInput', newValue, idx, this.values, newValues); */
            this.emitter.trigger('addhistory', new FieldChangeAction(this.values, newValues, val => { this.values = val; }));
            this.values = newValues;

            console.log('VectorControlView triggering engine process from onInput');
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
</style>

<style>
#app .vector-control-container input {
    width: 2em;
    padding: 0;
}
#app .vector-control-container .v-input {
    margin: inherit;
    padding: 0px 4px;
}
#app .vector-control-container .v-input__slot {
    padding: 0px 6px;
    background-color: rgba(255, 255, 255, 0.05);
}
#app .vector-control-container .v-input__control {
    min-height: 28px;
}
</style>
