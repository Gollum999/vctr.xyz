<template lang="pug">
md-card.node(md-with-hover :class="[selected(), node.name] | kebab")
  // TODO editable titles
  .title {{node.name}}

  .node-body
    // Inputs
    // 0 indexed
    .input(v-for='(input, idx) in inputs()' :key="input.key" :style="{'grid-row': idx + 1}")
      .input-wrapper
        Socket(v-socket:input="input" type="input" :socket="input.socket")
        .input-title(v-show='!input.showControl()') {{input.name}}
        .input-control(v-show='input.showControl()' v-control="input.control")

    // Controls
    .control(v-for='(control, idx) in controls()' v-control="control")

    // Outputs
    .output(v-for='(output, idx) in outputs()' :key="output.key" :style="{'grid-row': idx + 1}")
      .output-title {{output.name}}
      Socket(v-socket:output="output" type="output" :socket="output.socket")
</template>

<script>
import mixin from '@/../node_modules/rete-vue-render-plugin/src/mixin';
import Socket from '@/../node_modules/rete-vue-render-plugin/src/Socket.vue';
// import '@/../node_modules/@material/card/mdc-card.scss';

export default {
    mixins: [mixin],
    components: {
        Socket,
    },
};
</script>

<style lang="sass">
// These will propogate down to sockets and controls
#app
  .node
    .md-input
      // border: 1px solid #555555
      // border-radius: 6px
      flex: 0 1 auto // Fixes extra-wide number inputs in Firefox
      font-size: 12px
    .md-field
      width: auto // Prevents control from overflowing grid cell... not sure why this is necessary or if there is a better way
      box-sizing: border-box
      padding-left: 4px
      background-color: #eeeeee
      padding-top: 0px
      margin: 0px 2px
      min-height: 12px
      .md-input,.md-textarea
        height: 28px
        line-height: 28px
// TODO this doesn't work, Socket is overriding
// .socket // TODO This is just a hack to avoid customizing Socket, but I may have to do that anyway
//   .number-value
//     background: #7777dd
//   .vector-value
//     background: #ff4444
//   width: 16px
//   height: 16px
//   .input
//     margin-left: -8px
//   .output
//     margin-right: -8px
</style>

<style lang="sass" scoped>
// @import "@material/card/mdc-card.scss"

// @import "../../node_modules/rete-vue-render-plugin/src/vars"
// $node-color: #aaaaaa
$node-color: #ffffff
// $node-color-selected: #cccccc
// I don't use the node group plugin...
$group-color: rgba(15, 80, 255, 0.2)
$group-handler-size: 40px
$group-handler-offset: -10px
$socket-size: 20px
$socket-margin: 6px
$socket-color: #96b38a
$node-width: 100px

.node
  background: $node-color
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
    display: inline-grid
    grid-template-columns: [inputs] auto [controls] auto [outputs] auto [end]
    grid-template-rows: auto
    .item
      border: 1px solid black
  &:hover
    background: lighten($node-color,4%)
  &.selected
    // background: $node-color-selected
    // border: 1px solid black // TODO temp, figure out a better indicator
  .title
    // background-color: #888888
    // color: white
    // font-family: sans-serif
    font-size: 14px
    padding: 4px
    margin: 0px 16px 4px
    border-bottom: 1px solid lightgray
    // border-radius: 10px 10px 0 0
  .input
    grid-column: inputs
    margin-right: 4px
    //*
    //border: 1px solid black
    // display: flex
    // flex-direction: column
    // justify-content: center
    // align-items: center
    // position: relative
  .input-wrapper
    height: 100%
    text-align: left
    // margin: auto 0px
  .input-control
    z-index: 1
    width: calc(100% - #{$socket-size + 2*$socket-margin})
    vertical-align: middle
    display: inline-block
  .control
    padding: $socket-margin $socket-size/2 + $socket-margin
    grid-column: controls
    display: contents
    // margin: 0px 4px // TODO doesn't work because display: contents
  .output
    text-align: right
    grid-column: outputs
    margin-left: 4px
  .input-title,.output-title
    vertical-align: middle
    text-align: left
    // position: absolute
    // top: 50%
    // transform: translateY(-50%)
    color: black
    display: inline-block
    // font-family: sans-serif
    // font-size: 12px
    margin: $socket-margin
    line-height: $socket-size
</style>
