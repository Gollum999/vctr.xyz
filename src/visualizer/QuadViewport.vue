<template>
  <div class="quad-viewport">
    <vgl-namespace class="vgl-namespace">
      <vgl-scene name="main_scene" ref="scene">
        <!-- <template v-for="(v, idx) in vectors"> -->
        <!--   {{idx}} {{v}} {{v.value}} {{v.color}} -->
        <!-- </template> -->
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
        <vgl-arrow-helper v-for="(v, idx) in vectors" v-if="v && vec3.length(v.value)"
            :key="idx"
            :position="'0 0 0'"
            :dir="`${v.value[0]} ${v.value[1]} ${v.value[2]}`"
            :color="v.color"
            :length="`${vec3.length(v.value)}`"
            :head-length="0.5"
            :head-width="0.5"
        />
        <vgl-ambient-light color="#ffeecc" />
        <vgl-directional-light position="0 1 1" />
        <vgl-axes-helper size="5" />
      </vgl-scene>

      <div v-if="expandedView" class="viewport-container viewport-container-expanded">
        <Viewport :view="expandedView" scene="main_scene" @expand-viewport="expandViewport" expanded />
      </div>
      <template v-else>
        <div class="flex-row">
          <!-- TODO its probably better to use a dynamic class rather than style -->
          <div class="viewport-container" :style="getStyle('top')">
            <Viewport view="top" scene="main_scene" @expand-viewport="expandViewport" />
          </div>
          <div class="viewport-container" :style="getStyle('free')">
            <Viewport view="free" scene="main_scene" @expand-viewport="expandViewport" />
          </div>
        </div>
        <div class="flex-row">
          <div class="viewport-container" :style="getStyle('front')">
            <Viewport view="front" scene="main_scene" @expand-viewport="expandViewport" />
          </div>
          <div class="viewport-container" :style="getStyle('side')">
            <Viewport view="side" scene="main_scene" @expand-viewport="expandViewport" />
          </div>
        </div>
      </template>
    </vgl-namespace>
  </div>
</template>

<script>
/* import * as THREE from 'three'; */
import Viewport from './Viewport';
import { vec3 } from 'gl-matrix';

class VectorView {
    constructor(value, color) {
        this.value = value;
        this.color = color;
    }
};

export default {
    name: 'QuadViewport',
    components: {
        Viewport,
    },
    data() {
        return {
            vectors: [],
            vec3: vec3, // For use in render
            expandedView: null,
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
                if (node.name === 'Vector') { // TODO conditional rendering, probably add a "render" attribute to nodes and update this check
                    /* console.log(node); */
                    this.vectors.push(new VectorView(node.data.vecctl, node.data.color)); // TODO need to figure out best practices for handling data in engine
                }
                /* console.log(node.name); */
                /* console.log(typeof(node)); */
            }
            /* this.vectors = */
        });
    },
    methods: {
        expandViewport(view) {
            if (this.expandedView) {
                console.log(`un-expanding ${view}`);
                this.expandedView = null;
            } else {
                console.log(`expanding ${view}`);
                this.expandedView = view;
            }
        },
        getStyle(view) {
            let vis = 'hidden';
            if (this.expandedView === null || this.expandedView === view) {
                vis = 'visible';
            }
            return {
                visibility: vis,
            };
        },
    },
};
</script>

<style scoped>
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
    box-sizing: border-box;
    border: 2px solid #dddddd;
    width: 100%;
}
.viewport-container-expanded {
    height: 100%;
}
</style>
