<template>
  <div ref="viewport" class="viewport">
    <!-- v-if="settings.values.showGrid" -->
    <vgl-grid-helper
        :ref="`grid-${view}`"
        :rotation="VIEW_VALUES[view].gridRotation"
        :size="VIEW_VALUES[view].gridSize"
        :divisions="VIEW_VALUES[view].gridDivisions"
        color-center-line="#888888"
        color-grid="#444444"
    />
    <!-- TODO use node id for key here?  or hash?  any way to access :key from inside component so I don't have to duplicate? -->
    <Scalar v-for="(s, idx) in renderScalars"
            :key="`scalar-${view}-${idx}`"
            :scalarKey="`scalar-${view}-${idx}`"
            :layer="VIEW_VALUES[view].layer"
            :display-type="settings.values.scalar.renderStyle"
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

<script lang="ts">
import Vue, { PropType } from 'vue';
import * as THREE from 'three';
import _ from 'lodash';
import CameraControls from 'camera-controls';

import Scalar from './Scalar.vue';
import * as settings from '../settings';
import { EventBus } from '../EventBus';
import * as util from '../util';
import type { vec3 } from 'gl-matrix';
import type { VglScene } from 'vue-gl';

CameraControls.install({ THREE: THREE });

const HIDDEN_LAYER = 31;

class ScalarView {
    constructor(public value: number, public color: string, public pos: vec3) {
        this.value = value;
        this.color = color;
        this.pos = pos;
    }
};

interface ViewConfig {
    layer: number;
    initialCameraPos: THREE.Spherical;
    gridSize: number;
    gridDivisions: number;
    gridRotation: string;
}

export default Vue.extend({
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
                    initialCameraPos: new THREE.Spherical(20, 0, 0),
                    gridSize: 20,
                    gridDivisions: 20,
                    gridRotation: '0 0 0 XYZ',
                },
                free: {
                    layer: 2,
                    initialCameraPos: new THREE.Spherical(20, Math.PI / 4.0, Math.PI / 4.0),
                    gridSize: 20,
                    gridDivisions: 20,
                    gridRotation: '0 0 0 XYZ',
                },
                front: {
                    layer: 3,
                    initialCameraPos: new THREE.Spherical(20, Math.PI / 2.0, 0),
                    gridSize: 20,
                    gridDivisions: 20,
                    gridRotation: `${Math.PI / 2} 0 0 XYZ`,
                },
                side: {
                    layer: 4,
                    initialCameraPos: new THREE.Spherical(20, Math.PI / 2.0, Math.PI / 2.0),
                    gridSize: 20,
                    gridDivisions: 20,
                    gridRotation: `0 0 ${Math.PI / 2} XYZ`,
                },
            } as { [key: string]: ViewConfig },
            canvasSize: {
                x: 0,
                y: 0,
            },
            settings: settings.viewportSettings,
            controls: null as CameraControls | null,
            clock: new THREE.Clock(),
            scalars: [] as Array<ScalarView>,
            lastViewportSize: null as THREE.Vector2 | null,
        };
    },

    computed: {
        orbitPos(): string {
            var result = this.VIEW_VALUES[this.view].initialCameraPos;
            /* console.log(`Setting orbitPos for "${this.view}" to "${result.radius} ${result.phi} ${result.theta}"`); */
            return `${result.radius} ${result.phi} ${result.theta}`; // TODO can I avoid this string step?
        },

        renderScalars(): Array<ScalarView> {
            return this.scalars.filter(s => {
                return s && s.value !== 0 && s.color !== null;
            });
        },
    },

    filters: {
        capitalize: util.capitalize,
    },

    watch: {
        'settings.values.showAxis': function (newVal, oldVal) { this.render(); }, // TODO ortho viewports do not immediately re-render even if I force it here
        'settings.values.showGrid': function (newVal, oldVal) {
            // Putting the vgl-grid-helper in a v-if causes its layers to be reset each time, so this is easier
            this.updateGridVisibility(newVal);
        },
    },

    mounted() {
        // console.log(`Viewport mounted ${this.view} ${this.sceneName}`, this, this.updateCanvasSize);

        const camera = (this.$refs.camera as any).inst;
        camera.layers.set(0); // All views share the default layer 0
        camera.layers.enable(this.VIEW_VALUES[this.view].layer);
        camera.layers.disable(HIDDEN_LAYER); // Reserve layer 31 for hiding things

        this.updateGridVisibility(this.settings.values.showGrid);

        // TODO maybe move camera + controls to component
        if (this.view !== 'free') {
            camera.zoom = 10;
        }
        this.controls = new CameraControls(camera, (this.$refs.renderer as any).inst.domElement);
        this.controls.draggingDampingFactor = 0.3;
        this.controls.dampingFactor = 0.3; // Damping after drag finished
        if (this.view === 'free') {
            this.controls.minDistance = 2; // How far we can zoom *in*
            this.controls.maxDistance = 50; // How far we can zoom *out*
            this.controls.maxPolarAngle = Math.PI / 2;
        } else {
            // TODO Get allow left click drag too?  (Will require modification of CameraControls I think...)
            this.controls.minZoom = 5; // How far we can zoom *out*
            this.controls.maxZoom = 115; // How far we can zoom *in*
            this.controls.azimuthRotateSpeed = 0; // No rotation
            this.controls.polarRotateSpeed = 0; // No rotation
        }

        this.loadCameraState();

        this.anim();

        // For some reason on Firefox, the iframe inside VglRenderer does not get an initial 'resize' callback after it loads;
        //   fake one to get viewports to render with the correct size.
        // TODO Maybe VglRenderer should be modified to do this
        for (const iframe of (this.$refs.renderer as Vue).$el.querySelectorAll('iframe')) {
            iframe.onload = () => {
                if (iframe == null || iframe.contentWindow == null) {
                    throw new Error('Renderer iframe contentWindow was null');
                }
                // TODO internet says this will not work in IE, need to do block below?  depends if bug affects more than just Firefox
                /* console.log('Viewport forcing resize event for VueGL renderer'); */
                iframe.contentWindow.dispatchEvent(new Event('resize'));
                // var resizeEvent = window.document.createEvent('UIEvents');
                // resizeEvent .initUIEvent('resize', true, false, window, 0);
                // window.dispatchEvent(resizeEvent);
            };
        }

        // TODO need to re-render when expanding, or somehow maintain state
        EventBus.$on('node_engine_processed', this.onNodeEngineProcessed);

        this.$nextTick(() => {
            this.updateCanvasSize();
        });
        EventBus.$on('split-resized', this.updateCanvasSize);
        EventBus.$on('render', this.render);
        /* this.$on('expand-viewport', this.updateCanvasSize); // This needs to happen for all viewports when any expanded or collapsed */
    },

    methods: {
        onNodeEngineProcessed(editorJson: { [key: string]: any }): void {
            this.saveCameraState();
            this.updateScalars(editorJson);
        },

        saveCameraState() {
            if (this.controls == null) {
                throw new Error('Viewport controls were null');
            }
            // TODO perspective camera does not save zoom
            // console.log(`Saving ${this.view} camera state to browser-local storage`, this.controls.toJSON());
            window.localStorage.setItem(`camera_${this.view}`, this.controls.toJSON());
        },

        loadCameraState() {
            if (this.controls == null) {
                throw new Error('Viewport controls were null');
            }
            // console.log(`Loading ${this.view} camera state from browser-local storage`);
            const cameraJson = window.localStorage.getItem(`camera_${this.view}`);
            if (cameraJson) {
                this.controls.fromJSON(cameraJson);
            }
        },

        updateScalars(editorJson: { [key: string]: any }): void {
            /* console.log('Viewport re-drawing scalars'); */
            this.scalars = [];
            // TODO may be a more ideomatic way to write this (filter?)
            for (const key in editorJson['nodes']) {
                const node = editorJson['nodes'][key];
                if (node.name === 'Scalar') {
                    this.scalars.push(new ScalarView(node.data.value[0], node.data.color.visible ? node.data.color.color : null, node.data.pos));
                    /* console.log('pushed scalar', this.scalars, node.data); */
                }
            }
            /* console.log('Viewport rendering scalars:', this.scalars); */
        },

        updateCanvasSize(): void {
            if (this.lastViewportSize === null) {
                throw new Error('lastViewportSize was null');
            }
            // console.log('updating canvas size', this.$refs.viewport.getBoundingClientRect(), this.lastViewportSize.width, this.lastViewportSize.height);
            this.canvasSize = {
                x: this.lastViewportSize.width,
                y: this.lastViewportSize.height,
            };
            this.render();
        },

        updateGridVisibility(visible: boolean) {
            if (visible) {
                (this.$refs[`grid-${this.view}`] as any).inst.layers.set(this.VIEW_VALUES[this.view].layer);
            } else {
                (this.$refs[`grid-${this.view}`] as any).inst.layers.set(HIDDEN_LAYER);
            }
            this.render();
        },

        anim(): void {
            // This is a hack -- not sure how to make this reactive, but this function is already conveniently called every tick...
            const viewportRect = (this.$refs.viewport as Element).getBoundingClientRect();
            const viewportSize = new THREE.Vector2(viewportRect.width, viewportRect.height);
            if (this.lastViewportSize === null || !viewportSize.equals(this.lastViewportSize)) {
                this.lastViewportSize = viewportSize;
                this.updateCanvasSize();
            }

            const delta = this.clock.getDelta();
            if (this.controls === null) {
                throw new Error('Controls were null');
            }
            const updated = this.controls.update(delta);
            requestAnimationFrame(this.anim);
            if (updated) {
                this.render();
                this.saveCameraState();
            }
        },

        render(): void {
            // console.log('render', this.$refs, this.$refs.renderer, this.$refs.camera, this.scene);
            // TODO might be cleaner to emit a 'render' event
            if (!_.isNil(this.scene)) {
                (this.$refs.renderer as any).inst.render((this.scene as any).inst, (this.$refs.camera as any).inst);
            }
        },

        expandThis(): void {
            // TODO expanding viewport resets camera (I guess because they are seperate components?)
            console.log(`Expand viewport ${this.view}`);
            this.$emit('expand-viewport', this.view);
        },
    },
});
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
.v-icon.viewport-expand-icon {
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
