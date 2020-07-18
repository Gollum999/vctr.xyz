<template lang="pug">
// TODO why is dark theme not applying?
v-card.node(dark hover :class="[selected(), node.name.toLowerCase()] | kebab")
  v-text-field.node-title(dense hide-details flat solo v-model="title" @blur="onTitleBlur" @keyup.enter="$event.target.blur()" size="10")
  .debug-node-id {{node.id}}

  .node-body
    // Inputs
    // 0 indexed
    .input(v-for='(input, idx) in filteredInputs' :key="`input.key-${idx}`" :style="{'grid-row': idx + 1}")
      Socket(v-if="input.socket !== null" v-socket:input="input" type="input" :socket="input.socket")
      .input-title(v-show='!input.showControl()') {{input.name}}
      .input-control(v-show='input.showControl()' v-control="input.control")

    // Controls
    .control(v-for='(control, idx) in filteredControls' :key="`control.key-${idx}`" v-control="control")

    // Outputs
    .output(v-for='(output, idx) in outputs()' :key="output.key" :class="{disabled: isDisabled()}" :style="{'grid-row': idx + 1}")
      .output-title(v-html="output.name")
      Socket(v-socket:output="output" type="output" :socket="output.socket")
</template>

<script>
import mixin from '@/../node_modules/rete-vue-render-plugin/src/mixin';
import Socket from '@/../node_modules/rete-vue-render-plugin/src/Socket.vue';
import { EventBus } from '../EventBus';
import * as settings from '../settings';

export default {
    mixins: [mixin],
    data() {
        return {
            advancedRenderControlsKey: 'pos', // TODO Remove this assumption
            settings: settings.nodeEditorSettings,
            displayTitle: this.node.data['display_title'] || this.node.name,
        };
    },
    methods: {
        onTitleBlur() {
            if (!this.displayTitle) {
                this.displayTitle = this.node.name;
            }
        },
        isDisabled() {
            return this.node.data['disabled'] || false;
        },
    },
    components: {
        Socket,
    },
    computed: {
        title: {
            get() {
                return this.displayTitle;
            },
            set(val) {
                this.displayTitle = val;
                this.node.data['display_title'] = val;
                EventBus.$emit('save');
            },
        },
        filteredInputs() {
            return this.inputs().filter(input => input.key !== this.advancedRenderControlsKey || this.settings.values.showAdvancedRenderSettings);
        },
        filteredControls() {
            return this.controls().filter(control => control.key !== this.advancedRenderControlsKey || this.settings.values.showAdvancedRenderSettings);
        },
    },
};
</script>

<style lang="sass">
// These will propogate down to sockets and controls
#app
  .node
    .v-text-field
      // border: 1px solid #555555
      // border-radius: 6px
      // flex: 0 1 auto // Fixes extra-wide number inputs in Firefox
      font-size: 12px
</style>

<style lang="sass" scoped>
// @import "@material/card/mdc-card.scss"

// @import "../../node_modules/rete-vue-render-plugin/src/vars"
$socket-size: 12px
$socket-margin: 4px
$node-width: 100px

#app .socket
  position: absolute
  margin: 0px
  min-height: initial
  border: 0px
  &:hover
    border: 2px solid white
  &.output
    left: 100%
    transform: translate(-50%)

.node
  cursor: pointer
  min-width: $node-width
  height: auto
  padding: 4px 0px
  box-sizing: content-box
  position: relative
  user-select: none
  .node-body
    width: 100%
    display: inline-grid
    grid-template-columns: [inputs] auto [controls] auto [outputs] auto [end]
    grid-template-rows: auto
  &.selected
    filter: brightness(120%)
  .debug-node-id
    position: absolute
    top: 4px
    right: 4px
  .node-title
    padding: 2px
    margin: 0px 8px 4px
    border-bottom: 1px solid rgba(128, 128, 128, 0.4)
    border-radius: 0
  .input,.output
    height: 100%
    display: flex
    flex-direction: column
    justify-content: center
    min-height: 30px
    &.disabled
      .socket
        filter: brightness(50%)
  .input-title,.output-title
    line-height: $socket-size
  .input
    grid-column: inputs
  .input-title
    text-align: left
    margin-left: $socket-size/2 + $socket-margin
  .control
    // padding: $socket-margin $socket-size/2 + $socket-margin
    grid-column: controls
    display: contents
    // margin: 0px 4px // TODO doesn't work because display: contents
  .output
    grid-column: outputs
  .output-title
    text-align: right
    margin-right: $socket-size/2 + $socket-margin
</style>

<style lang="sass">
/* Global overrides for Rete style */
$socket-color-scalar: #7777dd
$socket-color-vector: #ff4444
$socket-color-matrix: #44ffff
$socket-size: 12px

#app
  .node
    .node-title
      width: auto
      input
        font-size: 14px
        padding: 4px 0 4px
        text-align: center
      .v-input__control
        min-height: 0
        &:focus-within
          filter: brightness(120%)
      .v-input__slot
        width: initial // TODO hack?  otherwise doesn't fit in my node
        padding: 0
    .control
      padding: 8px // TODO doesn't work because of display: contents

  .connection
    /* Fix display bug with connections */
    /* TODO I think something with bootstrap causes the svg element to be aligned to center */
    position: absolute
    left: 0px
    z-index: -5
    .main-path
      stroke: black
      stroke-width: 3px

  .socket
    width: $socket-size
    height: $socket-size
    &.input
      margin-left: -$socket-size/2
    &.output
      margin-right: -$socket-size/2
    &.scalar-value
      background: $socket-color-scalar
    &.vector-value
      background: $socket-color-vector
    &.matrix-value
      background: $socket-color-matrix
    &.scalar-or-vector
      background: #bb5d90
      background: linear-gradient(180deg, $socket-color-scalar 50%, $socket-color-vector 50%)
    &.scalar-or-matrix
      background: #5dbbee
      background: linear-gradient(180deg, $socket-color-scalar 50%, $socket-color-matrix 50%)
    &.vector-or-matrix
      background: #a1a1a1
      background: linear-gradient(180deg, $socket-color-vector 50%, $socket-color-matrix 50%)
    &.anything
      background: #aaaaaa
      background: linear-gradient(180deg, $socket-color-scalar 34%, $socket-color-vector 34% 66%, $socket-color-matrix 66%)
      background: conic-gradient($socket-color-scalar 120deg, $socket-color-vector 120deg 240deg, $socket-color-matrix 240deg 360deg)
</style>
