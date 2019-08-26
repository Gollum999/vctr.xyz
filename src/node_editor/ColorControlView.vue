<template>
<div class="color-control-container">
  <div class="color-label input-title" :style="{'grid-row': rowIdx}">Color</div>

  <v-menu
      class="color-picker"
      v-model="colorPickerShowing"
      :close-on-content-click="false"
  >
    <template v-slot:activator="{ on: showColorPicker }">
      <div class="color-picker-button" :style="{'background-color': color.hex, 'grid-row': rowIdx}" v-on="showColorPicker"></div>
    </template>

    <v-card class="color-picker-popup">
      <v-color-picker v-model="color.hex" />
    </v-card>
  </v-menu>

  <!-- <div class="color-picker-button" :style="{'grid-row': rowIdx, 'background-color': color}"> -->
  <!--   <div @mousedown.stop @touchstart.stop> -->
  <!--     <color-picker :value="color" @input="colorUpdated" disableAlpha /> -->
  <!--   </div> -->
  <!-- </div> -->

</div>
</template>

<script>
import { FieldChangeAction } from './util';

export default {
    props: {
        getData:       { type: Function, required: true }, // injected by Rete
        putData:       { type: Function, required: true }, // injected by Rete
        emitter:       { type: Object,   required: true },
        dataKey:       { type: String,   required: true },
        rowIdx:        { type: Number,   required: true }, // used to position control within parent grid
        globalVuetify: { type: Object,   required: true },
    },

    data() {
        return {
            color: '#000000',
            prevColor: null,
            colorPickerShowing: false,
        };
    },

    created() {
        // HACK: There is some bug when using Vuetify in local Vue contexts that causes certain components to break
        // https://github.com/retejs/vue-render-plugin/issues/14
        this.$vuetify = this.globalVuetify;
    },

    watch: {
        colorPickerShowing(showing) {
            /* console.log('colorPickerShowing CHANGED', showing, this.color); */
            if (showing) {
                /* console.log('colorPicker opened', this.color, this.prevColor); */
                this.prevColor = Object.assign({}, this.color);
            } else {
                /* console.log('colorPicker closed', this.color, this.prevColor); */
                this.emitter.trigger('addhistory', new FieldChangeAction(this.prevColor, this.color, (color) => { this.color = color; }));
            }
        },
        color: {
            deep: true,
            handler(newVal, oldVal) {
                /* console.log('color watcher', this.dataKey, this.color, oldVal, newVal); */
                if (this.dataKey) {
                    this.putData(this.dataKey, newVal);
                }
                this.emitter.trigger('process'); // TODO the reactivity is nice, but will get very laggy if there is any mildly complex logic.  since the color has no effect on any other state, could just use a separate "re-render but don't process everything" event
            },
        },
    },

    mounted() {
        /* console.log('ColorControlView MOUNTED', this.color, this.getData(this.dataKey)); */
        if (!this.dataKey) {
            throw new Error('dataKey was null??');
        }
        this.color = this.getData(this.dataKey) || '#000000';
        /* console.log('ColorControlView mounted', this.dataKey, this.color); */
        this.putData(this.dataKey, this.color);
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
