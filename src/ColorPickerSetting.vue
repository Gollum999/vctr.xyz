<template>
  <div class="color-picker-option">
    <v-menu
        class="color-picker"
        v-model="colorPickerShowing"
        :close-on-content-click="false"
    >
      <template v-slot:activator="{ on: showColorPicker }">
        <v-input hide-details :disabled="disabled">
          <template v-slot:prepend>
            <div class="color-picker-button" v-on="showColorPicker"
                 :style="{'background-color': color, 'opacity': disabled ? 0.5 : 1.0}" />
          </template>
          <v-label class="color-picker-label"><slot></slot></v-label>
        </v-input>
      </template>

      <v-card class="color-picker-popup">
        <v-color-picker v-model="color" />
      </v-card>
    </v-menu>
  </div>
</template>

<script>
export default {
    name: 'ColorPickerSetting',
    props: {
        value:        { type: String, required: true },
        disabled:     { type: Boolean, default: false },
        disableAlpha: { type: Boolean, default: false },
    },
    data() {
        return {
            color: this.value,
            colorPickerShowing: false,
        };
    },
    watch: {
        color(newVal, oldVal) {
            this.$emit('input', newVal);
        },
    },
};
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
.color-picker-button {
    display: inline-block;
    grid-column: controls;
    width: 20px;
    height: 20px;
    /* background-color: yellow; */
    border: 1px solid rgba(128, 128, 128, 0.4);
    margin: 8px 0px 8px 8px;
}
.color-picker-label {
    padding-left: 9px;
}
/* color-picker { */
/*     transform: none; */
/* } */
</style>

<style>
body .color-picker-popup {
    max-height: initial;
    z-index: 1000; /* vue-js-modal uses z-index 999 */
}
</style>
