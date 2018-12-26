<template>
  <div class="quad-viewport">
    <vgl-namespace class="vgl-namespace">
      <vgl-scene name="main_scene" ref="scene">
        <!-- <template v-for="(v, idx) in vectors">
             {{idx}} {{v}}
             </template> -->
        <vgl-grid-helper
            ref="grid_free"
            :size="20"
            :divisions="20"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-grid-helper
            ref="grid_top"
            :size="200"
            :divisions="200"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-grid-helper
            ref="grid_front"
            :rotation="`${Math.PI / 2} 0 0`"
            :size="200"
            :divisions="200"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-grid-helper
            ref="grid_side"
            :rotation="`0 0 ${Math.PI / 2}`"
            :size="200"
            :divisions="200"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-arrow-helper v-for="(v, idx) in vectors" v-if="v && vec3.length(v)"
            :key="idx"
            :position="'0 0 0'"
            :dir="`${v[0]} ${v[1]} ${v[2]}`"
            :color="'#ffff00'"
            :length="`${vec3.length(v)}`"
            :head-length="0.5"
            :head-width="0.5"
        />
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
import { vec3 } from 'gl-matrix';

export default {
    name: 'QuadViewport',
    components: {
        Viewport,
    },
    data() {
        return {
            vectors: [],
            vec3: vec3, // For use in render
        };
    },
    mounted() {
        // TODO not confident that this will always stick around (any reason the canvas might be destroyed and recreated?)
        /* this.$refs.scene.inst.background = new THREE.Color(0xffffff); */
        console.log('QuadViewport mounted');

        this.$refs.grid_free.inst.layers.set(1);
        this.$refs.grid_top.inst.layers.set(2);
        this.$refs.grid_front.inst.layers.set(3);
        this.$refs.grid_side.inst.layers.set(4);

        this.$root.$on('node_engine_processed', editorJson => {
            console.log('QuadViewport handling process event');
            this.vectors = [];
            // TODO may be a more ideomatic way to write this (filter?)
            for (const key in editorJson.nodes) {
                const node = editorJson.nodes[key];
                if (node.name === 'Vector Output') {
                    /* console.log(node); */
                    this.vectors.push(node.data.vecctl); // TODO need to figure out best practicies for handling data in engine
                }
                /* console.log(node.name); */
                /* console.log(typeof(node)); */
            }
            /* this.vectors = */
        });
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
