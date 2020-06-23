<template>
  <div class="color-picker-option">
    <v-input hide-details :disabled="disabled">
      <template v-slot:prepend>
        <color-picker-button
            class="color-picker"
            v-model="color"
            :disabled="disabled"
        />
      </template>
      <v-label class="color-picker-label"><slot></slot></v-label>
    </v-input>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import ColorPickerButton from './ColorPickerButton.vue';

export default Vue.extend({
    name: 'ColorPickerSetting',
    components: {
        'color-picker-button': ColorPickerButton,
    },
    props: {
        value:    { type: String, required: true },
        disabled: { type: Boolean, default: false },
    },
    data() {
        return {
            color: this.value,
        };
    },
    watch: {
        color(newVal: string, oldVal: string) {
            this.$emit('input', newVal);
        },
    },
});
</script>

<style scoped>
.v-label {
    line-height: 44px; /* TODO: Seems like there should be a better way to center things... */
}
.color-picker {
    display: none; /* TODO this is creating extra vertical space for some reason */
}
.color-picker-option {
    text-align: left;
}
.color-picker-label {
    padding-left: 9px;
}
</style>

<style>
.color-picker-option .color-picker-button {
    margin: 8px 0px 8px 13px;
}
</style>
