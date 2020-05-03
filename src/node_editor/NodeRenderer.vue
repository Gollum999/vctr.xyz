<template lang="pug">
// TODO may need to have manual control over class name
// TODO why is dark theme not applying?
v-card.node(dark hover :class="[selected(), node.name] | kebab")
  // TODO editable titles
  // .title {{node.name}}
  .title {{node.name}} ({{node.id}})

  .node-body
    // Inputs
    // 0 indexed
    // TODO there was some warning here about duplicate key 'vec', fixed by adding idx to key but I'm not entirely sure how that worked or whether that is correct
    // .input(v-for='(input, idx) in filteredInputs' :key="`input.key-${idx}`" :style="{'grid-row': idx + 1}")
    // TODO I was originally mixing v-if with v-for because inputs() is not reactive, then I changed it... should I have?
    .input(v-for='(input, idx) in filteredInputs' :key="`input.key-${idx}`" :style="{'grid-row': idx + 1}")
      Socket(v-if="input.socket !== null" v-socket:input="input" type="input" :socket="input.socket")
      .input-title(v-show='!input.showControl()') {{input.name}}
      .input-control(v-show='input.showControl()' v-control="input.control")

    // Controls
    .control(v-for='(control, idx) in filteredControls' :key="`control.key-${idx}`" v-control="control")

    // Outputs
    .output(v-for='(output, idx) in outputs()' :key="output.key" :class="{disabled: isDisabled()}" :style="{'grid-row': idx + 1}")
      .output-title {{output.name}}
      Socket(v-socket:output="output" type="output" :socket="output.socket")
</template>

<script>
import mixin from '@/../node_modules/rete-vue-render-plugin/src/mixin';
import Socket from '@/../node_modules/rete-vue-render-plugin/src/Socket.vue';
// import '@/../node_modules/@material/card/mdc-card.scss';
import settings from '../settings';

export default {
    mixins: [mixin],
    data() {
        return {
            advancedRenderControlsKey: 'pos', // TODO Remove this assumption
            settings: settings.nodeEditorSettings,
        };
    },
    methods: {
        isDisabled() {
            return this.node.data['disabled'] || false;
        },
    },
    components: {
        Socket,
    },
    computed: {
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
// $node-color: #aaaaaa
$node-color: #ffffff
// $node-color-selected: #ffe2e2
$node-color-selected: #4d4d4d
// I don't use the node group plugin...
$group-color: rgba(15, 80, 255, 0.2)
$group-handler-size: 40px
$group-handler-offset: -10px
$socket-size: 14px
$socket-margin: 4px
$socket-color: #96b38a
$node-width: 100px

#app .socket
  position: absolute
  margin: 0px
  min-height: initial
  &.output
    left: 100%
    transform: translate(-50%)

.node
  // background: $node-color
  // border: 1px solid #555555
  // border-radius: 10px
  cursor: pointer
  min-width: $node-width
  height: auto
  padding: 4px 0px
  box-sizing: content-box
  position: relative
  user-select: none
  // box-shadow:
  .node-body
    width: 100%
    display: inline-grid
    grid-template-columns: [inputs] auto [controls] auto [outputs] auto [end]
    grid-template-rows: auto
    .item
      border: 1px solid black
  // &:hover
  //   background: lighten($node-color,4%)
  &.selected
    background-color: $node-color-selected
    // border: 1px solid black // TODO temp, figure out a better indicator
  .title
    // background-color: #888888
    // color: white
    // font-family: sans-serif
    font-size: 14px
    padding: 4px
    margin: 0px 16px 4px
    border-bottom: 1px solid rgba(128, 128, 128, 0.4)
    // border-radius: 10px 10px 0 0
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
#app
  .node
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
    width: 14px
    height: 14px
    &.input
      margin-left: -7px
    &.output
      margin-right: -7px
    &.scalar-value
      background: #7777dd
    &.vector-value
      background: #ff4444
    &.matrix-value
      background: #44ffff
    &.scalar-or-vector
      background: #bb5d90 // TODO is there a more graceful way to have a "fallback" style?  media query?
      background: linear-gradient(180deg, #7777dd 50%, #ff4444 50%)
    &.scalar-or-matrix
      background: #5dbbee
      background: linear-gradient(180deg, #7777dd 50%, #44ffff 50%)
    &.vector-or-matrix
      background: #a1a1a1
      background: linear-gradient(180deg, #ff4444 50%, #44ffff 50%)
    &.anything
      background: #aaaaaa
      background: linear-gradient(180deg, #7777dd 34%, #ff4444 34% 66%, #44ffff 66%)
      background: conic-gradient(#7777dd 120deg, #ff4444 120deg 240deg, #44ffff 240deg 360deg)
</style>
