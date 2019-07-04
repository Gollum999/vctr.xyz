<template>
  <div class="color-picker-option">
    <md-menu
        class="color-picker"
        md-size="auto"
        md-direction="bottom-start"
        md-align-trigger
    >
      <div class="color-picker-button" :style="{'background-color': color.hex}" md-menu-trigger>
        <md-menu-content class="color-picker-popup">
          <color-picker v-model="color" :disableAlpha="disableAlpha" />
        </md-menu-content>
      </div>
    </md-menu>
    <label class="color-picker-label"><slot></slot></label>
  </div>
</template>

<script>
import { Chrome } from 'vue-color';

export default {
    name: 'ColorPickerSetting',
    props: {
        value:        { type: Object, required: true },
        disableAlpha: { type: Boolean, default: false },
    },
    components: {
        'color-picker': Chrome,
    },
    data() {
        return {
            color: this.value,
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
.color-picker-option {
    text-align: left;
}
.md-menu.color-picker {
    vertical-align: middle;
}
.color-picker-button {
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
body .color-picker-popup .md-menu-content-container {
    border-radius: 2px; /* TODO Is there a good way to make this match value from md-card? */
}
body .color-picker-popup .md-list {
    padding-inline-start: initial;
    padding: initial;
}
</style>
