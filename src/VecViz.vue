<template>
  <div>
    <Split class="vec-viz" direction="vertical" :gutterSize="8" @onDragStart="onDragStart" @onDragEnd="onDragEnd">
      <SplitArea :size="50" :minSize="150">
        <QuadViewport />
      </SplitArea>
      <SplitArea :size="50" :minSize="150">
        <!-- <NodeEditor @process="editorJson = $event"/> -->
        split B
      </SplitArea>
    </Split>
    <p style="color: white">{{editorJson}}</p>
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
    methods: {
        onDragStart() {
            console.log('split drag start');
        },
        onDragEnd() {
            console.log('split drag end');
        },
    },
};
</script>

<style scoped>
.vec-viz {
    /* height: 100%; */
    height: 800px; /* TODO viewport height - margin */
    border: 1px solid #dddddd;
    border-bottom: 3px solid #dddddd; /* TODO this is a hack to work around the overflow on NodeEditor */
}
</style>
