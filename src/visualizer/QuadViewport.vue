<template>
  <div class="quad-viewport">
    <vgl-namespace class="vgl-namespace">
      <vgl-scene name="main_scene" ref="scene">
        <!-- <template v-for="(v, idx) in vectors"> -->
        <!--   {{idx}} {{v}} {{v.value}} {{v.color}} -->
        <!-- </template> -->
        <vgl-grid-helper
            ref="grid_free"
            v-if="settings.showGrid"
            :size="20"
            :divisions="20"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-grid-helper
            ref="grid_top"
            v-if="settings.showGrid"
            :size="200"
            :divisions="200"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-grid-helper
            ref="grid_front"
            v-if="settings.showGrid"
            :rotation="`${Math.PI / 2} 0 0`"
            :size="200"
            :divisions="200"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-grid-helper
            ref="grid_side"
            v-if="settings.showGrid"
            :rotation="`0 0 ${Math.PI / 2}`"
            :size="200"
            :divisions="200"
            :color-center-line="'#888888'"
            :color-grid="'#444444'"
        />
        <vgl-arrow-helper v-for="(v, idx) in renderVectors"
            :key="`vector-${idx}`"
            :position="'0 0 0'"
            :dir="`${v.value[0]} ${v.value[1]} ${v.value[2]}`"
            :color="v.color"
            :length="`${vec3.length(v.value)}`"
            :head-length="0.5"
            :head-width="0.5"
        />
        <!-- <div v-for="(s, idx) in scalars"
             :key="`scalar-${idx}`">
             {{idx}} {{s}} ({{s.color}} {{s.value}})
             </div> -->
        <!-- TODO use node id here?  or hash? -->
        <Scalar v-for="(s, idx) in scalars"
            :key="`scalar-${idx}`"
            :idx="idx"
            display-type="circle"
            :value="s.value"
            :color="s.color"
            :canvas-size="canvasSize()"
            :line-thickness="0.1"
        />
        <vgl-ambient-light color="#ffeecc" />
        <vgl-directional-light position="0 1 1" />
        <vgl-axes-helper v-if="settings.showAxis" size="5" />
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
          <div ref="viewportFree" class="viewport-container" :style="getStyle('free')">
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
import _ from 'lodash';
import { vec3 } from 'gl-matrix';

import { EventBus } from '../EventBus';
import Scalar from './Scalar';
import Viewport from './Viewport';

class ScalarView {
    constructor(value, color) {
        this.value = value;
        this.color = color;
    }
};

class VectorView {
    constructor(value, color) {
        this.value = value;
        this.color = color;
    }
};

export default {
    name: 'QuadViewport',
    components: {
        Scalar,
        Viewport,
    },
    data() {
        return {
            // TODO how to use the defaults defined in SettingsModal?  I think I either have to pass them down as props, or just define them in some common location
            settings: {
                showAxis: true,
                showGrid: true,
            },
            scalars: [],
            vectors: [],
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
    mounted() {
        const loadSettings = () => {
            this.settings = JSON.parse(window.localStorage.getItem('viewport_settings')) || this.settings;
            console.log('Viewport settings loaded:', this.settings);

            this.$nextTick(() => {
                // TODO This is kind of a hack; figure out best practices with v-if plus stateful components
                // TODO maybe I can just hide the grids or set the color to transparent
                // TODO It may make more sense to just duplicate the scene and everything in it for each viewport
                if (!_.isNil(this.$refs.grid_free)) {
                    this.$refs.grid_free.inst.layers.set(1);
                }
                if (!_.isNil(this.$refs.grid_top)) {
                    this.$refs.grid_top.inst.layers.set(2);
                }
                if (!_.isNil(this.$refs.grid_front)) {
                    this.$refs.grid_front.inst.layers.set(3);
                }
                if (!_.isNil(this.$refs.grid_side)) {
                    this.$refs.grid_side.inst.layers.set(4);
                }
                this.$forceUpdate(); // TODO bit of a hack; if showAxis is toggled, the ortho views don't re-render immediately
            });
        };
        loadSettings();
        EventBus.$on('settings-updated', loadSettings);

        // TODO not confident that this will always stick around (any reason the canvas might be destroyed and recreated?)
        /* this.$refs.scene.inst.background = new THREE.Color(0xffffff); */

        this.$root.$on('node_engine_processed', editorJson => {
            console.log('QuadViewport handling process event');
            this.scalars = [];
            this.vectors = [];
            // TODO may be a more ideomatic way to write this (filter?)
            for (const key in editorJson.nodes) {
                const node = editorJson.nodes[key];
                if (node.name === 'Scalar') { // TODO conditional rendering, probably add a "render" attribute to nodes and update this check
                    this.scalars.push(new ScalarView(node.data.value, node.data.color.rgba));
                    /* console.log('pushed scalar', this.scalars, node.data); */
                } else if (node.name === 'Vector') {
                    this.vectors.push(new VectorView(node.data.value, node.data.color.hex)); // TODO need to figure out best practices for handling data in engine
                }
            }
        });
    },
    methods: {
        canvasSize() {
            // TODO HACK: need to move the scene and all related things into Viewport; right now the data flow is spaghetti
            return {
                x: this.$refs.viewportFree.getBoundingClientRect().width - 4,
                y: this.$refs.viewportFree.getBoundingClientRect().height - 4,
            };
        },
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
