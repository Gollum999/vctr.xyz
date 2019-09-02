// "Global" objects can go in here, and they will be shared between all Viewports.
// Anything that should only draw in a subset of Viewports, or anything that draws differently per Viewport, should be defined
//   inside of Viewport and constrained to a single layer.

<template>
  <div class="fill">
    <vgl-namespace class="fill">
      <vgl-scene name="main_scene" ref="scene" class="fill vgl-scene">
        <!-- <template v-for="(v, idx) in vectors"> -->
        <!--   {{idx}} {{v}} {{v.value}} {{v.color}} -->
        <!-- </template> -->
        <vgl-arrow-helper v-for="(v, idx) in renderVectors"
            :key="`vector-${idx}`"
            :position="'0 0 0'"
            :dir="`${v.value[0]} ${v.value[1]} ${v.value[2]}`"
            :color="v.color"
            :length="`${vec3.length(v.value)}`"
            :head-length="0.5"
            :head-width="0.5"
        />
        <Matrix v-for="(m, idx) in matrices"
            :key="`matrix-${idx}`"
            display-type="vector-field"
            :value="m.value"
            :color="m.color"
            :vector-scale="settings.matrix.vectorScale"
            :density="settings.matrix.fieldDensity"
            :fieldSize="settings.matrix.fieldSize"
        />
        <vgl-ambient-light color="#ffeecc" />
        <vgl-directional-light position="0 1 1" />
        <vgl-axes-helper v-if="settings.showAxis" size="5" />

        <div :class="['viewport-container', isHidden('top') ? 'hidden' : '', isExpanded('top') ? 'fill' : '']">
          <Viewport ref="viewport_top" view="top" sceneName="main_scene" :scene="$refs.scene" :expanded="isExpanded('top')" @expand-viewport="expandViewport" />
        </div>
        <div :class="['viewport-container', isHidden('free') ? 'hidden' : '', isExpanded('free') ? 'fill' : '']">
          <Viewport ref="viewport_free" view="free" sceneName="main_scene" :scene="$refs.scene" :expanded="isExpanded('free')" @expand-viewport="expandViewport" />
        </div>
        <div :class="['viewport-container', isHidden('front') ? 'hidden' : '', isExpanded('front') ? 'fill' : '']">
          <Viewport ref="viewport_front" view="front" sceneName="main_scene" :scene="$refs.scene" :expanded="isExpanded('front')" @expand-viewport="expandViewport" />
        </div>
        <div :class="['viewport-container', isHidden('side') ? 'hidden' : '', isExpanded('side') ? 'fill' : '']">
          <Viewport ref="viewport_side" view="side" sceneName="main_scene" :scene="$refs.scene" :expanded="isExpanded('side')" @expand-viewport="expandViewport" />
        </div>
      </vgl-scene>
    </vgl-namespace>
  </div>
</template>

<script>
/* import * as THREE from 'three'; */
import { vec3 } from 'gl-matrix';

import settings from '../settings';
import Matrix from './Matrix';
import Viewport from './Viewport';
import { EventBus } from '../EventBus';

class VectorView {
    constructor(value, color) {
        this.value = value;
        this.color = color;
    }
};

class MatrixView { // TODO combine, move somewhere common?
    constructor(value, color) {
        this.value = value;
        this.color = color;
    }
};

export default {
    name: 'QuadViewport',
    components: {
        Matrix,
        Viewport,
    },
    data() {
        return {
            settings: null,
            vectors: [],
            matrices: [],
            vec3: vec3, // For use in render
            expandedView: null,
        };
    },
    computed: {
        renderVectors() {
            return this.vectors.filter(v => {
                return v && vec3.length(v.value);
            });
        },
    },
    created() {
        const loadSettings = () => {
            this.settings = settings.loadSettings('viewportSettings');
            console.log('Viewport settings loaded:', this.settings);
        };
        loadSettings();
        EventBus.$on('settings-updated', loadSettings);
    },
    mounted() {
        // TODO not confident that this will always stick around (any reason the canvas might be destroyed and recreated?)
        /* this.$refs.scene.inst.background = new THREE.Color(0xffffff); */

        EventBus.$on('node_engine_processed', editorJson => {
            console.log('QuadViewport handling process event');
            this.vectors = [];
            this.matrices = [];
            // TODO may be a more ideomatic way to write this (filter?)
            for (const key in editorJson.nodes) {
                const node = editorJson.nodes[key];
                /* console.log('adding node', node, 'to be rendered'); */
                if (node.name === 'Vector') {
                    this.vectors.push(new VectorView(node.data.value, node.data.color)); // TODO need to figure out best practices for handling data in engine
                } else if (node.name === 'Matrix') {
                    this.matrices.push(new MatrixView(node.data.value, node.data.color));
                }
            }
            // console.log('QuadViewport rendering vectors:', this.vectors);
            console.log('QuadViewport rendering matrices:', this.matrices);
        });
    },
    methods: {
        expandViewport(view) {
            console.log('QuadViewport expanding', view);
            if (this.expandedView) {
                console.log(`un-expanding ${view}`);
                this.expandedView = null;
            } else {
                console.log(`expanding ${view}`);
                this.expandedView = view;
            }

            // Make sure scalars see the new canvas size so they can draw correctly
            ['top', 'free', 'front', 'side'].forEach(view => this.$refs[`viewport_${view}`].updateCanvasSize());
        },
        isHidden(view) {
            /* console.log('checking', view, 'for hidden', (this.expandedView !== null && this.expandedView !== view)); */
            return (this.expandedView !== null && this.expandedView !== view);
        },
        isExpanded(view) {
            /* console.log('checking', view, 'for expanded', this.expandedView === view); */
            return this.expandedView === view;
        },
    },
};
</script>

<style scoped>
.vgl-scene {
    line-height: 0px;
}
.viewport-container {
    display: inline-block;
    box-sizing: border-box;
    border: 2px solid #bbbbbb;
    width: 50%;
    height: 50%;
    line-height: initial;
}
.viewport-container-expanded {
    height: 100%;
}
.fill {
    width: 100%;
    height: 100%;
}
.hidden {
    display: none;
}
</style>
