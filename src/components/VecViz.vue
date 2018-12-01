<template>
  <div>
    <Split class="vec-viz" direction="vertical" :gutterSize="8">
      <SplitArea :size="50" :minSize="150">
        <Viewport />
      </SplitArea>
      <SplitArea :size="50" :minSize="150">
        <NodeEditor @process="editorJson = $event"/>
      </SplitArea>
    </Split>
    <p>{{editorJson}}</p>
  </div>
</template>

<script>
import Viewport from './Viewport';
import NodeEditor from './NodeEditor';

export default {
    name: 'VecViz',
    data() {
        return {
            editorJson: '',
        };
    },
    components: {
        Viewport,
        NodeEditor,
    },
};
</script>

<style>
.vec-viz {
    /* height: 100%; */
    height: 800px; /* TODO viewport height - margin */
    border: 1px solid yellow;
}
</style>
