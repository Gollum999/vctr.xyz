<template>
  <v-menu v-model="colorPickerShowing" :close-on-content-click="false" :disabled="disabled">
    <template v-slot:activator="{ on: showColorPicker }">
      <div class="color-picker-button" v-on="showColorPicker"
           :style="{'background-color': color, 'opacity': disabled ? 0.5 : 1.0}" />
    </template>

    <v-card class="color-picker-popup">
      <v-color-picker v-model="color" />
    </v-card>
  </v-menu>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

export default Vue.extend({
    name: 'ColorPickerButton',
    props: {
        value:    { type: String, default: '#ffffff' },
        disabled: { type: Boolean, default: false },
    },
    data() {
        return {
            color: this.value,
            colorPickerShowing: false,
        };
    },
    watch: {
        value(newVal: string, oldVal: string): void { // TODO is there a Vue shortcut for forwarding things to/from child component in a wrapper like this?
            this.color = newVal;
        },
        color(newVal: string, oldVal: string): void {
            this.$emit('input', newVal);
        },
        colorPickerShowing(newVal: boolean, oldVal: boolean): void {
            this.$emit('color-picker-toggled', newVal);
        },
    },
});
</script>

<style scoped>
.color-picker-button {
    display: inline-block;
    width: 1.5em;
    height: 1.5em;
    border: 1px solid rgba(128, 128, 128, 0.4);
}
</style>

<style>
body .color-picker-popup {
    max-height: initial;
    z-index: 1000; /* vue-js-modal uses z-index 999 */
}
#app .v-color-picker input {
    color: white; /* TODO bug in Vuetify for v-color-picker dark theme? */
}
</style>
