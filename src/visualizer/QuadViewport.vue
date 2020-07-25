// "Global" objects can go in here, and they will be shared between all Viewports.
// Anything that should only draw in a subset of Viewports, or anything that draws differently per Viewport, should be defined
//   inside of Viewport and constrained to a single layer.

<template>
  <div class="fill">
    <vgl-namespace class="fill">
      <vgl-scene name="main_scene" ref="scene" class="fill vgl-scene">
        <!-- HACK: Capping vector head sizes at 0.0001 to prevent warnings in console from Three when rendering -->
        <vgl-arrow-helper v-for="(v, idx) in renderVectors"
            :key="`vector-${idx}`"
            :position="`${v.pos[0]} ${v.pos[1]} ${v.pos[2]}`"
            :dir="`${v.value[0]} ${v.value[1]} ${v.value[2]}`"
            :color="v.color"
            :length="`${vec3.length(v.value)}`"
            :head-length="Math.max(settings.values.vector.headSize, 0.0001)"
            :head-width="Math.max(settings.values.vector.headSize, 0.0001)"
        />
        <Matrix v-for="(m, idx) in renderMatrices"
            :key="`matrix-${idx}`"
            display-type="vector-field"
            :value="m.value"
            :color="m.color"
            :pos="m.pos"
            :vector-scale="settings.values.matrix.vectorScale"
            :density="settings.values.matrix.fieldDensity"
            :fieldSize="settings.values.matrix.fieldSize"
        />
        <vgl-ambient-light color="#ffeecc" />
        <vgl-directional-light position="0 1 1" />
        <vgl-axes-helper v-if="settings.values.showAxis" size="5" />

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
        <resize-observer @notify="handleResize" />
      </vgl-scene>
    </vgl-namespace>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import * as settings from '../settings';
import Matrix from './Matrix.vue';
import Viewport from './Viewport.vue';
import { EventBus } from '../EventBus';
import { vec3, mat4 } from 'gl-matrix';

class VectorView {
    constructor(public value: vec3, public color: string | null, public pos: vec3) {
        this.value = value;
        this.color = color;
        this.pos = pos;
    }
};

class MatrixView {
    constructor(public value: mat4, public color: string | null, public pos: vec3) {
        this.value = value;
        this.color = color;
        this.pos = pos;
    }
};

enum ViewType {
    TOP = 'top',
    FREE = 'free',
    FRONT = 'front',
    SIDE = 'side',
}

type Size = { width: number, height: number };

export default Vue.extend({
    name: 'QuadViewport',

    components: {
        Matrix,
        Viewport,
    },

    data() {
        return {
            vec3, // For use in render

            settings: settings.viewportSettings,
            vectors: [] as Array<VectorView>,
            matrices: [] as Array<MatrixView>,
            expandedView: null as ViewType | null,
        };
    },

    computed: {
        // TODO may be faster to check this on insert
        renderVectors(): Array<VectorView> {
            return this.vectors.filter(v => {
                return v && vec3.length(v.value) && v.color !== null;
            });
        },
        renderMatrices(): Array<MatrixView> {
            return this.matrices.filter(m => {
                return m && m.color !== null;
            });
        },
    },

    watch: {
        // HACK: These fix 'visible' changes not immediately re-rendering
        renderVectors(newVal, oldVal) { this.$nextTick(() => { EventBus.$emit('render'); }); },
        renderMatrices(newVal, oldVal) { this.$nextTick(() => { EventBus.$emit('render'); }); },
    },

    mounted() {
        EventBus.$on('node_engine_processed', (editorJson: { [key: string]: any }) => {
            this.vectors = [];
            this.matrices = [];
            for (const key in editorJson.nodes) {
                const node = editorJson.nodes[key];
                if (node.name === 'Vector') {
                    this.vectors.push(new VectorView(node.data.value, node.data.color.visible ? node.data.color.color : null, node.data.pos));
                } else if (node.name === 'Matrix') {
                    this.matrices.push(new MatrixView(node.data.value, node.data.color.visible ? node.data.color.color : null, node.data.pos));
                }
            }
        });

        this.$nextTick(() => { // TODO have to do next tick because of the same bug that causes flashing when shrinking; remove this whenever I fix that
            this.forceHandleResize();
        });
    },

    methods: {
        expandViewport(view: ViewType) {
            if (this.expandedView) {
                this.expandedView = null;
            } else {
                this.expandedView = view;
            }

            // Make sure scalars see the new canvas size so they can draw correctly
            [ViewType.TOP, ViewType.FREE, ViewType.FRONT, ViewType.SIDE].forEach(view => (this.$refs[`viewport_${view}`] as InstanceType<typeof Viewport>).updateCanvasSize());

            // HACK: Force width to be recalculated when expanding
            this.forceHandleResize();
        },

        isHidden(view: ViewType) {
            return (this.expandedView !== null && this.expandedView !== view);
        },

        isExpanded(view: ViewType) {
            return this.expandedView === view;
        },

        forceHandleResize() {
            const size = (this.$refs.scene as Vue).$el.getBoundingClientRect();
            this.handleResize({width: size.width, height: size.height});
        },

        handleResize({width, height}: Size) {
            // HACK: Viewports do not render anything when they have sub-pixel widths, so force integer sizes
            // TODO something causes flashing when shrinking
            [ViewType.TOP, ViewType.FRONT].forEach(view => {
                const viewport = (this.$refs[`viewport_${view}`] as Vue).$el;
                const parent = viewport.parentElement;
                if (parent == null) {
                    throw new Error('Parent element is null');
                }
                if (this.isExpanded(view)) {
                    parent.style.width = '100%';
                } else if (!this.isHidden(view)) {
                    parent.style.width = `${Math.ceil(width / 2)}px`;
                }
            });
            [ViewType.FREE, ViewType.SIDE].forEach(view => {
                const viewport = (this.$refs[`viewport_${view}`] as Vue).$el;
                const parent = viewport.parentElement;
                if (parent == null) {
                    throw new Error('Parent element is null');
                }
                if (this.isExpanded(view)) {
                    parent.style.width = '100%';
                } else if (!this.isHidden(view)) {
                    parent.style.width = `${Math.floor(width / 2)}px`;
                }
            });
        },
    },
});
</script>

<style scoped>
.vgl-scene {
    line-height: 0px;
    position: relative; /* for vue-resize */
}
.viewport-container {
    display: inline-block;
    box-sizing: border-box;
    border: 2px solid #616161;
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
