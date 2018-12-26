<template>
  <div>
    <Split class="vec-viz" direction="vertical" :gutterSize="8">
      <SplitArea :size="50" :minSize="150">
        <QuadViewport />
      </SplitArea>
      <SplitArea :size="50" :minSize="150">
        <NodeEditor @process="editorJson = $event"/>
      </SplitArea>
    </Split>
    <p>{{editorJson}}</p>
  </div>
</template>

<script>
import QuadViewport from './visualizer/QuadViewport';
import NodeEditor from './node_editor/NodeEditor';

export default {
    name: 'VecViz',
    data() {
        return {
            editorJson: '',
        };
    },
    components: {
        QuadViewport,
        NodeEditor,
    },
};
</script>

<style>
.vec-viz {
    /* height: 100%; */
    height: 800px; /* TODO viewport height - margin */
    border: 1px solid #dddddd;
    border-bottom: 3px solid #dddddd; /* TODO this is a hack to work around the overflow on NodeEditor */
}
</style>
