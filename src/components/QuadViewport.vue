<template>
  <div class="quad-viewport">
    <vgl-namespace class="vgl-namespace">
      <vgl-scene name="main_scene" ref="scene">
        <vgl-box-geometry name="cube" width=1 height=2 depth=3 />
        <vgl-mesh-standard-material name="std" />
        <vgl-mesh geometry="cube" material="std" />
        <vgl-ambient-light color="#ffeecc" />
        <vgl-directional-light position="0 1 1" />
        <vgl-axes-helper size="5" />
      </vgl-scene>

      <div class="flex-row">
        <div class="viewport-container">
          <Viewport view="top" scene="main_scene" />
        </div>
        <div class="viewport-container">
          <Viewport view="free" scene="main_scene" />
        </div>
      </div>
      <div class="flex-row">
        <div class="viewport-container">
          <Viewport view="front" scene="main_scene" />
        </div>
        <div class="viewport-container">
          <Viewport view="side" scene="main_scene" />
        </div>
      </div>
    </vgl-namespace>
  </div>
</template>

<script>
/* import * as THREE from 'three'; */
import Viewport from './Viewport';

export default {
    name: 'QuadViewport',
    components: {
        Viewport,
    },
    mounted() {
        // TODO not confident that this will always stick around (any reason the canvas might be destroyed and recreated?)
        /* console.log('QuadViewport mounted'); */
        /* this.$refs.scene.inst.background = new THREE.Color(0xffffff); */
    },
};
</script>

<style>
.quad-viewport {
    width: 100%;
    height: 100%;
}
.vgl-namespace {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}
.flex-row {
    display: flex;
    flex-direction: row;
    height: 50%;
}
.viewport-container {
    border: 2px solid #dddddd;
    width: 100%;
}
</style>
