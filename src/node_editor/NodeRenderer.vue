<template lang="pug">
.node(:class="[selected(), node.name] | kebab")
  .title {{node.name}}

  // Outputs
  .output(v-for='output in outputs()' :key="output.key")
    .output-title {{output.name}}
    Socket(v-socket:output="output", type="output", :socket="output.socket")

  // Controls
  .control(
    v-for='control in controls()',
    v-control="control"
  )

  // Inputs
  .input(v-for='input in inputs()' :key="input.key")
    Socket(v-socket:input="input", type="input", :socket="input.socket")
    .input-title(v-show='!input.showControl()') {{input.name}}
    .input-control(
      v-show='input.showControl()'
      v-control="input.control"
    )
</template>

<script>
import mixin from '@/../node_modules/rete-vue-render-plugin/src/mixin';
import Socket from '@/../node_modules/rete-vue-render-plugin/src/Socket.vue';

export default {
    mixins: [mixin],
    components: {
        Socket,
    },
};
</script>

<style lang="sass">
// These will propogate down to sockets and controls
.node
  input
    border: 1px solid #555555
    border-radius: 6px
    padding-left: 4px

// TODO this doesn't work, Socket is overriding
// .socket // TODO This is just a hack to avoid customizing Socket, but I may have to do that anyway
//   width: 16px
//   height: 16px
//   .input
//     margin-left: -8px
//   .output
//     margin-right: -8px
//   .number-value
//     background: #7777dd
//   .vector-value
//     background: #ff4444
</style>

<style lang="sass" scoped>
// @import "../../node_modules/rete-vue-render-plugin/src/vars"
$node-color: #aaaaaa;
$node-color-selected: #cccccc;
// I don't use the node group plugin...
$group-color: rgba(15, 80, 255, 0.2)
$group-handler-size: 40px
$group-handler-offset: -10px
$socket-size: 24px
$socket-margin: 6px
$socket-color: #96b38a
$node-width: 100px

.node
  background: $node-color
  border: 1px solid #555555
  border-radius: 10px
  cursor: pointer
  min-width: $node-width
  height: auto
  padding-bottom: 0px
  box-sizing: content-box
  position: relative
  user-select: none
  &:hover
    background: lighten($node-color,4%)
  &.selected
    background: $node-color-selected
  .title
    background-color: #888888
    color: white
    font-family: sans-serif
    font-size: 18px
    padding: 6px
    border-radius: 10px 10px 0 0
  .output
    text-align: right
  .input
    text-align: left
  .input-title,.output-title
    vertical-align: ref
    color: white
    display: inline-block
    font-family: sans-serif
    font-size: 14px
    margin: $socket-margin
    line-height: $socket-size
  .input-control
    z-index: 1
    width: calc(100% - #{$socket-size + 2*$socket-margin})
    vertical-align: middle
    display: inline-block
  .control
    padding: $socket-margin $socket-size/2 + $socket-margin
</style>
