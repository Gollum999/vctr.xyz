<template>
<div :class="[nodeType.toLowerCase(), 'control-container']" :style="{'grid-row': rowIdx}">
  <!-- TODO why is dark theme not applying? -->
  <v-text-field
    v-for="(item, idx) in values" :key="`${nodeType}-value-${idx}`"
    solo
    dark
    hide-details
    type="number"
    :value="item.val"
    :readonly="readOnly"
    @input="onInput($event, idx)"
    @copy.prevent.stop="onCopy"
    @paste.prevent.stop="onPaste($event)"
  />
</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import _ from 'lodash';
import history from '../history';
import { FieldChangeAction } from '../history_actions';
import { ValueNodeType } from './node_util';

type ValueItemWrapper = { val: number };
type ValueWrapper = Array<ValueItemWrapper>;
type DefaultValueWrapper = readonly ValueItemWrapper[];

const DEFAULT_SCALAR_WRAPPER: DefaultValueWrapper = Object.freeze([{val: 1}]);
const DEFAULT_VECTOR_WRAPPER: DefaultValueWrapper = Object.freeze([{val: 1}, {val: 1}, {val: 1}]);
const DEFAULT_MATRIX_WRAPPER: DefaultValueWrapper = Object.freeze([
    {val: 1}, {val: 0}, {val: 0}, {val: 0},
    {val: 0}, {val: 1}, {val: 0}, {val: 0},
    {val: 0}, {val: 0}, {val: 1}, {val: 0},
    {val: 0}, {val: 0}, {val: 0}, {val: 1},
]);

const EXPECTED_SIZE = {
    [ValueNodeType.SCALAR]: 1,
    [ValueNodeType.VECTOR]: 3,
    [ValueNodeType.MATRIX]: 16,
};

function wrapperToArray(wrapper: ValueWrapper): Array<number> {
    return wrapper.map(axis => axis.val);
}

function arrayToWrapper(array: Array<number>): ValueWrapper {
    return array.map(i => { return {val: parseFloat(i.toFixed(3))}; }); // TODO could add a component that stores the raw value and only rounds in the display layer
}

export default Vue.extend({
    props: {
        getData:       { type: Function, required: true },
        putData:       { type: Function, required: true },
        emitter:       { type: Object,   required: true }, // injected by Rete
        dataKey:       { type: String,   required: true }, // injected by Rete
        rowIdx:        { type: Number,   required: true }, // used to position control within parent grid
        nodeType:      { type: String as PropType<ValueNodeType>, required: true, validator: value => Object.values(ValueNodeType).includes(value) },
    },

    data() {
        // To make everything properly reactive, must use proxy array instead of raw vec3/mat4, and must wrap array elements in objects
        // Scalars do not actually need this, but just follow the pattern for consistency
        const defaultValues = {
            [ValueNodeType.SCALAR]: DEFAULT_SCALAR_WRAPPER,
            [ValueNodeType.VECTOR]: DEFAULT_VECTOR_WRAPPER,
            [ValueNodeType.MATRIX]: DEFAULT_MATRIX_WRAPPER,
        }[this.nodeType];
        return {
            defaultValues: defaultValues,
            values: defaultValues.slice(),
            readOnly: false,
        };
    },

    watch: {
        values: {
            handler: function (newVal: ValueWrapper, oldVal: ValueWrapper) {
                if (this.dataKey) {
                    this.putData(this.dataKey, wrapperToArray(this.values));
                }
            },
            deep: true,
        },
    },

    methods: {
        setValue(value: Array<number>) {
            if (_.isNil(value) || value.length !== EXPECTED_SIZE[this.nodeType]) {
                this.values = this.defaultValues.slice();
            } else {
                this.values = arrayToWrapper(value);
            }
        },

        onInput(newValue: string, idx: number) {
            const newValues = this.values.map(i => ({...i})); // Make sure to deep copy the wrappers
            newValues[idx].val = parseFloat(newValue);
            const action = new FieldChangeAction(this.values, newValues, val => {
                this.values = val;
                this.emitter.trigger('process');
            });
            history.addAndDo(action);
        },

        onCopy(event: ClipboardEvent) {
            const valueArray = wrapperToArray(this.values);
            const text = (() => {
                switch (this.nodeType) {
                case ValueNodeType.SCALAR: return valueArray.join(', ');
                case ValueNodeType.VECTOR: // fallthrough
                case ValueNodeType.MATRIX: return '[' + valueArray.join(', ') + ']'; // TODO could copy as 4x4 instead of 1x16
                };
            })();
            if (event.clipboardData == null) {
                throw new Error('Clipboard data was null');
            }
            event.clipboardData.setData('text', text);
        },

        onPaste(event: ClipboardEvent) {
            if (this.readOnly) {
                return;
            }
            if (event.clipboardData == null) {
                throw new Error('Clipboard data was null');
            }
            const text = event.clipboardData.getData('text');
            const split = text.replace(/[[\]{}()]/g, '').split(/[ ,;]+/);
            if (split.length !== EXPECTED_SIZE[this.nodeType]) {
                return;
            }
            // TODO consider falling back to default paste handler if split is wrong length (so pasting single numbers appends instead of overwrites selected cell)
            const result = wrapperToArray(this.values);
            for (let offset = 0; offset < EXPECTED_SIZE[this.nodeType] && offset < split.length; ++offset) {
                result[offset] = parseFloat(split[offset]);
            }
            this.setValue(result);
        },
    },

    mounted() {
        const data = this.getData(this.dataKey);
        this.setValue(data);
    },
});
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
    filter: brightness(120%);
}
#app .control-container .v-input__control {
    min-height: 28px;
}
</style>
