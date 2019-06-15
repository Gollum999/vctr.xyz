<template>
<div class="color-control-container">
  <div class="color-label input-title" :style="{'grid-row': rowIdx}">Color</div>

  <md-menu
      class="color-picker"
      :style="{'grid-row': rowIdx}"
      md-size="auto"
      md-direction="bottom-start"
      md-align-trigger
      @md-opened="colorPickerOpened"
      @md-closed="colorPickerClosed"
  >
    <div class="color-picker-button" :style="{'background-color': color.hex}" md-menu-trigger>
      <md-menu-content class="color-picker-popup">
        <color-picker :value="color.hex" @input="colorUpdated" disableAlpha />
      </md-menu-content>
    </div>
  </md-menu>

  <!-- <div class="color-picker-button" :style="{'grid-row': rowIdx, 'background-color': color}"> -->
  <!--   <div @mousedown.stop @touchstart.stop> -->
  <!--     <color-picker :value="color" @input="colorUpdated" disableAlpha /> -->
  <!--   </div> -->
  <!-- </div> -->

</div>
</template>

<script>
import { Chrome } from 'vue-color';
import { FieldChangeAction } from './util';

export default {
    props: {
        getData: { type: Function, required: true }, // injected by Rete
        putData: { type: Function, required: true }, // injected by Rete
        emitter: { type: Object,   required: true },
        dataKey: { type: String,   required: true },
        rowIdx:  { type: Number,   required: true }, // used to position control within parent grid
    },

    data() {
        return {
            color: { hex: '#ff00ff' },
        };
    },

    components: {
        'color-picker': Chrome,
    },

    mounted() {
        if (!this.dataKey) {
            throw new Error('dataKey was null??');
        }
        this.color = this.getData(this.dataKey) || '#FFFF00';
        /* console.log('ColorControlView mounted', this.color); */
        this.putData(this.dataKey, this.color);
    },

    // watch: {
    //     color(newVal, oldVal) {
    //         console.log('color watcher', oldVal, newVal);
    //     },
    // },

    methods: {
        colorPickerOpened(event) {
            /* console.log('colorPickerOpened', event); */
            this.prevColor = this.color;
        },
        colorPickerClosed(event) { // TODO I don't think vue-color supports the typical "change" action, so need to fudge it
            /* console.log('colorPickerClosed', event); */
            this.emitter.trigger('addhistory', new FieldChangeAction(this.prevColor, this.color, (color) => { this.color = color; }));
        },
        colorUpdated(color) {
            /* console.log('colorUpdated:', color); */
            this.color = color;
            if (this.dataKey) {
                this.putData(this.dataKey, this.color);
            }
            this.emitter.trigger('process'); // TODO the reactivity is nice, but will get very laggy if there is any mildly complex logic.  since the color has no effect on any other state, could just use a separate "re-render but don't process everything" event
        },
    },
};
</script>

<style scoped>
.color-control-container {
    display: contents;
}
.color-label {
    /* TODO use socket label style */
    grid-column: inputs;
}
.color-picker-button {
    grid-column: controls;
    width: 1.4em;
    height: 1.4em;
    /* background-color: yellow; */
    border: 1px solid rgba(128, 128, 128, 0.4);
    margin: 0.5em;
}
/* color-picker { */
/*     transform: none; */
/* } */
.color-picker-trigger {
    height: 100%;
    width: 100%;
}
</style>

<style>
body .color-picker-popup {
    max-height: initial;
}
body .color-picker-popup .md-menu-content-container {
    border-radius: 2px; /* TODO Is there a good way to make this match value from md-card? */
}
body .color-picker-popup .md-list {
    padding-inline-start: initial;
    padding: initial;
}
</style>
