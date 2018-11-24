<template>
  <div class="vec-viz">
    <div>
      <NodeEditor />
    </div>
  </div>
</template>

<script>
import NodeEditor from '@/components/NodeEditor';

export default {
    name: 'VecViz',
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
