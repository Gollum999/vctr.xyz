<template>
  <div ref="viewport" class="viewport">
    <!-- v-if="settings.values.showGrid" -->
    <vgl-grid-helper
        :ref="`grid-${view}`"
        :rotation="VIEW_VALUES[view].grid_rotation"
        :size="VIEW_VALUES[view].grid_size"
        :divisions="VIEW_VALUES[view].grid_divisions"
        color-center-line="#888888"
        color-grid="#444444"
    />
    <!-- <div v-for="(s, idx) in scalars"
         :key="`scalar-${idx}`">
         {{idx}} {{s}} ({{s.color}} {{s.value}})
         </div> -->
    <!-- TODO use node id for key here?  or hash?  any way to access :key from inside component so I don't have to duplicate? -->
    <Scalar v-for="(s, idx) in renderScalars"
            :key="`scalar-${view}-${idx}`"
            :scalarKey="`scalar-${view}-${idx}`"
            :layer="VIEW_VALUES[view].layer"
            display-type="circle"
            :value="s.value"
            :color="s.color"
            :pos="s.pos"
            :canvas-size="canvasSize"
            :line-thickness="0.1"
    />

    <vgl-renderer ref="renderer" :scene="sceneName" :camera="view" antialias style="height: 100%; flex: 1;">
      <template v-if="view === 'free'">
        <vgl-perspective-camera ref="camera" :name="view" :orbit-position="orbitPos" />
      </template>
      <template v-else>
        <!-- TODO how to get zoom to fill viewport on window resize like perspective camera does? -->
        <vgl-orthographic-camera ref="camera" :name="view" :orbit-position="orbitPos" />
      </template>
    </vgl-renderer>
    <span class="viewport-label">{{view | capitalize}}</span>
    <v-icon class="viewport-expand-icon" @click="expandThis">{{expanded ? 'fullscreen_exit' : 'fullscreen'}}</v-icon>
  </div>
</template>

<script>
import * as THREE from 'three';
import _ from 'lodash';
import CameraControls from 'camera-controls';

import Scalar from './Scalar';
import * as settings from '../settings';
import { EventBus } from '../EventBus';
import * as util from '../util';

CameraControls.install({ THREE: THREE });

const HIDDEN_LAYER = 31;

class ScalarView {
    constructor(value, color, pos) {
        this.value = value;
        this.color = color;
        this.pos = pos;
    }
};

export default {
    components: {
        Scalar,
    },

    props: {
        view:      { type: String, required: true, validator: value => { return ['side', 'front', 'top', 'free'].indexOf(value) !== -1; } },
        sceneName: { type: String, required: true },
        scene:     { required: true, validator: value => { return value instanceof Object || _.isNil(value); } },
        expanded:  { type: Boolean, default: false },
    },

    data() {
        return {
            VIEW_VALUES: {
                top: {
                    layer: 1,
                    initial_camera_pos: new THREE.Spherical(20, 0, 0),
                    grid_size: 200,
                    grid_divisions: 200,
                    grid_rotation: '0 0 0',
                },
                free: {
                    layer: 2,
                    initial_camera_pos: new THREE.Spherical(20, Math.PI / 4.0, Math.PI / 4.0),
                    grid_size: 20,
                    grid_divisions: 20,
                    grid_rotation: '0 0 0',
                },
                front: {
                    layer: 3,
                    initial_camera_pos: new THREE.Spherical(20, Math.PI / 2.0, 0),
                    grid_size: 200,
                    grid_divisions: 200,
                    grid_rotation: `${Math.PI / 2} 0 0`,
                },
                side: {
                    layer: 4,
                    initial_camera_pos: new THREE.Spherical(20, Math.PI / 2.0, Math.PI / 2.0),
                    grid_size: 200,
                    grid_divisions: 200,
                    grid_rotation: `0 0 ${Math.PI / 2}`,
                },
            },
            canvasSize: {
                x: 0,
                y: 0,
            },
            settings: settings.viewportSettings,
            controls: null,
            clock: new THREE.Clock(),
            scalars: [],
            lastViewportSize: null,
        };
    },

    computed: {
        orbitPos() {
            var result = this.VIEW_VALUES[this.view].initial_camera_pos;
            /* console.log(`Setting orbitPos for "${this.view}" to "${result.radius} ${result.phi} ${result.theta}"`); */
            return `${result.radius} ${result.phi} ${result.theta}`; // TODO can I avoid this string step?
        },

        renderScalars() {
            return this.scalars.filter(s => {
                return s && s.value !== 0 && s.color !== null;
            });
        },
    },

    filters: {
        capitalize: util.capitalize,
    },

    watch: {
        'settings.values.showAxis': function (newVal, oldVal) { this.render(); }, // TODO ortho viewports don't immediately re-render
        'settings.values.showGrid': function (newVal, oldVal) {
            // Putting the vgl-grid-helper in a v-if causes its layers to be reset each time, so this is easier
            if (newVal) {
                this.$refs[`grid-${this.view}`].inst.layers.set(this.VIEW_VALUES[this.view].layer);
            } else {
                this.$refs[`grid-${this.view}`].inst.layers.set(HIDDEN_LAYER);
            }
            this.render();
        },
    },

    mounted() {
        // console.log(`Viewport mounted ${this.view} ${this.sceneName}`, this, this.updateCanvasSize);

        this.$refs.camera.inst.layers.set(0); // All views share the default layer 0
        this.$refs.camera.inst.layers.enable(this.VIEW_VALUES[this.view].layer);
        this.$refs.camera.inst.layers.disable(HIDDEN_LAYER); // Reserve layer 31 for hiding things

        this.$refs[`grid-${this.view}`].inst.layers.set(this.VIEW_VALUES[this.view].layer);

        // TODO maybe move camera + controls to component
        this.controls = new CameraControls(this.$refs.camera.inst, this.$refs.renderer.inst.domElement);
        this.controls.draggingDampingFactor = 0.3;
        this.controls.dampingFactor = 0.3; // Damping after drag finished
        if (this.view === 'free') {
            this.controls.minDistance = 2;
            this.controls.maxDistance = 100;
            this.controls.maxPolarAngle = Math.PI / 2;
        } else {
            // TODO Get allow left click drag too?  (Will require modification of CameraControls I think...)
            this.controls.minZoom = 2;
            this.controls.maxZoom = 100;
            this.controls._camera.zoom = 10;
            this.controls.dollySpeed = -1; // TODO ortho zoom is inverted for some reason?
            this.controls.azimuthRotateSpeed = 0; // No rotation
            this.controls.polarRotateSpeed = 0; // No rotation
        }
        this.anim();

        // For some reason on Firefox, the iframe inside VglRenderer does not get an initial 'resize' callback after it loads;
        //   fake one to get viewports to render with the correct size.
        // TODO Maybe VglRenderer should be modified to do this
        for (const iframe of this.$refs.renderer.$el.querySelectorAll('iframe')) {
            iframe.onload = () => {
                // TODO internet says this won't work in IE, need to do block below?  depends if bug affects more than just Firefox
                /* console.log('Viewport forcing resize event for VueGL renderer'); */
                iframe.contentWindow.dispatchEvent(new Event('resize'));
                // var resizeEvent = window.document.createEvent('UIEvents');
                // resizeEvent .initUIEvent('resize', true, false, window, 0);
                // window.dispatchEvent(resizeEvent);
            };
        }

        // TODO need to re-render when expanding, or somehow maintain state
        EventBus.$on('node_engine_processed', this.updateScalars);

        this.$nextTick(() => {
            this.updateCanvasSize();
        });
        EventBus.$on('split-resized', this.updateCanvasSize);
        /* this.$on('expand-viewport', this.updateCanvasSize); // This needs to happen for all viewports when any expanded or collapsed */
    },

    methods: {
        updateScalars(editorJson) {
            /* console.log('Viewport re-drawing scalars'); */
            this.scalars = [];
            // TODO may be a more ideomatic way to write this (filter?)
            for (const key in editorJson.nodes) {
                const node = editorJson.nodes[key];
                if (node.name === 'Scalar') { // TODO conditional rendering, probably add a "render" attribute to nodes and update this check
                    this.scalars.push(new ScalarView(node.data.value[0], node.data.color.visible ? node.data.color.color : null, node.data.pos));
                    /* console.log('pushed scalar', this.scalars, node.data); */
                }
            }
            /* console.log('Viewport rendering scalars:', this.scalars); */
        },

        updateCanvasSize() {
            // console.log('updating canvas size', this.$refs.viewport.getBoundingClientRect(), this.lastViewportSize.width, this.lastViewportSize.height);
            this.canvasSize = {
                x: this.lastViewportSize.width,
                y: this.lastViewportSize.height,
            };
            this.render();
        },

        anim() {
            // This is a hack -- not sure how to make this reactive, but this function is already conveniently called every tick...
            const viewportSize = new THREE.Vector2(this.$refs.viewport.getBoundingClientRect().width, this.$refs.viewport.getBoundingClientRect().height);
            if (this.lastViewportSize === null || !viewportSize.equals(this.lastViewportSize)) {
                this.lastViewportSize = viewportSize;
                this.updateCanvasSize();
            }

            const delta = this.clock.getDelta();
            const updated = this.controls.update(delta);
            requestAnimationFrame(this.anim);
            if (updated) {
                this.render();
            }
        },

        render() {
            // console.log('render', this.$refs, this.$refs.renderer, this.$refs.camera, this.scene);
            // TODO might be cleaner to emit a 'render' event
            if (!_.isNil(this.scene)) {
                this.$refs.renderer.inst.render(this.scene.inst, this.$refs.camera.inst);
            }
        },

        expandThis() {
            // TODO expanding viewport resets camera (I guess because they are seperate components?)
            console.log(`Expand viewport ${this.view}`);
            this.$emit('expand-viewport', this.view);
        },
    },
};
</script>

<style scoped>
.viewport {
    overflow: hidden; /* Prevents flickering scroll bars when resizing */
    position: relative;
    height: 100%;
}
.viewport-label {
    position: absolute;
    left: 0.4em;
    top: 0.2em;
    color: white;
}
.viewport-expand-icon {
    position: absolute;
    right: 0.2em;
    bottom: 0.2em;
}
</style>

<style>
/* #app .viewport canvas { */
/*     height: 100%; */
/* } */
#app .viewport iframe {
    visibility: visible !important; /* This fixes getting 'resize' callbacks on Firefox */

    /* These two make the resize behavior a bit more responsive/less jumpy on Firefox */
    /* margin-right: initial; */
    /* NOTE: This breaks ALL events with newer vue-gl versions. */
    /* position: absolute; /* This positions the iframe on top of the canvas to avoid weird flow issues */
}
</style>
