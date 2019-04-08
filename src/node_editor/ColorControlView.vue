<template>
<div class="color-control-container">
  <div class="color-label input-title" :style="{'grid-row': rowIdx}">Color</div>

  <md-menu class="color-picker" :style="{'grid-row': rowIdx}" md-size="auto" md-direction="bottom-start" md-align-trigger>
    <div class="color-picker-button" :style="{'background-color': color}" md-menu-trigger>
      <md-menu-content class="color-picker-popup">
        <color-picker :value="color" @input="colorUpdated" disableAlpha />
      </md-menu-content>
    </div>
  </md-menu>

  <!-- <div class="color-picker-button" :style="{'grid-row': rowIdx, 'background-color': color}"> -->
  <!--   <div @mousedown.stop="" @touchstart.stop=""> -->
  <!--     <color-picker :value="color" @input="colorUpdated" disableAlpha /> -->
  <!--   </div> -->
  <!-- </div> -->

</div>
</template>

<script>
import { Chrome } from 'vue-color';

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
            color: null,
        };
    },

    components: {
        'color-picker': Chrome,
    },

    mounted() {
        this.color = this.getData(this.dataKey) || '#FFFF00';
    },

    methods: {
        colorUpdated(color) {
            this.color = color.hex;
            if (this.dataKey) {
                this.putData(this.dataKey, this.color);
            }
            this.emitter.trigger('process');
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
