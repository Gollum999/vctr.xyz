<template>
  <div class="vec-viz">
    <div>
      <NodeEditor @process="editorJson = $event"/>
    </div>
    <p>{{editorJson}}</p>
  </div>
</template>

<script>
import NodeEditor from '@/components/NodeEditor';

export default {
    name: 'VecViz',
    data() {
        return {
            editorJson: '',
        };
    },
    components: {
        NodeEditor,
    },
};
</script>

<style>
.vec-viz {
    height: 100%;
}
</style>
