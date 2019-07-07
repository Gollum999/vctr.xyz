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

        <div v-if="expandedView" class="viewport-container viewport-container-expanded">
          <Viewport :view="expandedView" sceneName="main_scene" :scene="$refs.scene" @expand-viewport="expandViewport" expanded />
        </div>
        <template v-else>
          <div class="flex-row">
            <!-- TODO its probably better to use a dynamic class rather than style -->
            <div :class="['viewport-container', isHidden('top') ? 'hidden' : '']">
              <Viewport view="top" sceneName="main_scene" :scene="$refs.scene" @expand-viewport="expandViewport" />
            </div>
            <div ref="viewportFree" :class="['viewport-container', isHidden('free') ? 'hidden' : '']">
              <Viewport view="free" sceneName="main_scene" :scene="$refs.scene" @expand-viewport="expandViewport" />
            </div>
          </div>
          <div class="flex-row">
            <div :class="['viewport-container', isHidden('front') ? 'hidden' : '']">
              <Viewport view="front" sceneName="main_scene" :scene="$refs.scene" @expand-viewport="expandViewport" />
            </div>
            <div :class="['viewport-container', isHidden('side') ? 'hidden' : '']">
              <Viewport view="side" sceneName="main_scene" :scene="$refs.scene" @expand-viewport="expandViewport" />
            </div>
          </div>
        </template>
      </vgl-scene>
    </vgl-namespace>
  </div>
</template>

<script>
/* import * as THREE from 'three'; */
import { vec3 } from 'gl-matrix';

import settings from '../settings';
import Scalar from './Scalar';
import Viewport from './Viewport';
import { EventBus } from '../EventBus';

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
            settings: settings.defaultSettings['viewport_settings'],
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
            this.settings = settings.loadSettings('viewport_settings');
            console.log('Viewport settings loaded:', this.settings);
        };
        loadSettings();
        EventBus.$on('settings-updated', loadSettings);

        // TODO not confident that this will always stick around (any reason the canvas might be destroyed and recreated?)
        /* this.$refs.scene.inst.background = new THREE.Color(0xffffff); */

        EventBus.$on('node_engine_processed', editorJson => {
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
            // console.log('NodeEditor rendering scalars:', this.scalars);
            // console.log('NodeEditor rendering vectors:', this.vectors);
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
        isHidden(view) {
            return (this.expandedView !== null && this.expandedView !== view);
        },
    },
};
</script>

<style scoped>
.fill {
    width: 100%;
    height: 100%;
}
.vgl-scene {
    display: flex;
    flex-direction: column;
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
.hidden {
    visibility: hidden;
}
</style>
