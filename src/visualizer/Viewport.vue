<template>
  <div ref="viewport" class="viewport">
    <vgl-grid-helper
        :ref="`grid-${view}`"
        :rotation="VIEW_VALUES[view].gridRotation"
        :size="VIEW_VALUES[view].gridSize"
        :divisions="VIEW_VALUES[view].gridDivisions"
        color-center-line="#888888"
        color-grid="#444444"
    />
    <!-- TODO any way to access :key from inside component so I don't have to duplicate? -->
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
import type { Node } from 'rete/types/core/data';

CameraControls.install({ THREE: THREE });

const HIDDEN_LAYER = 31;

class ScalarView {
    constructor(public value: number, public color: string | null, public pos: vec3) {
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
            return `${result.radius} ${result.phi} ${result.theta}`; // TODO use proper types from three.js instead of magic strings
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
        const camera = (this.$refs.camera as any).inst;
        camera.layers.set(0); // All views share the default layer 0
        camera.layers.enable(this.VIEW_VALUES[this.view].layer);
        camera.layers.disable(HIDDEN_LAYER); // Reserve layer 31 for hiding things
        if (this.view === 'top') {
            // Looking straight down works fine when the camera is initially created, but when we serialize it, something gets jacked up.
            // Since CameraControls uses `lookAt`, it relies on `up` for the correct camera rotation.
            camera.up = new THREE.Vector3(0, 0, -1);
        }

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
            // TODO Allow left click drag too?  (Will require modification of CameraControls I think...)
            this.controls.minZoom = 5; // How far we can zoom *out*
            this.controls.maxZoom = 115; // How far we can zoom *in*
            this.controls.azimuthRotateSpeed = 0; // No rotation
            this.controls.polarRotateSpeed = 0; // No rotation
        }

        this.loadCameraState();

        this.anim();

        // For some reason on Firefox, the iframe inside VglRenderer does not get an initial 'resize' callback after it loads;
        //   fake one to get viewports to render with the correct size.
        for (const iframe of (this.$refs.renderer as Vue).$el.querySelectorAll('iframe')) {
            iframe.onload = () => {
                if (iframe == null || iframe.contentWindow == null) {
                    throw new Error('Renderer iframe contentWindow was null');
                }
                iframe.contentWindow.dispatchEvent(new Event('resize'));
            };
        }

        EventBus.$on('node_engine_processed', this.onNodeEngineProcessed);

        this.$nextTick(() => {
            this.updateCanvasSize();
        });
        EventBus.$on('split-resized', this.updateCanvasSize);
        EventBus.$on('render', this.render);
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
            window.localStorage.setItem(`camera_${this.view}`, this.controls.toJSON());
        },

        loadCameraState() {
            if (this.controls == null) {
                throw new Error('Viewport controls were null');
            }
            const cameraJson = window.localStorage.getItem(`camera_${this.view}`);
            if (cameraJson) {
                this.controls.fromJSON(cameraJson);
            }
        },

        updateScalars(editorJson: { [key: string]: any }): void {
            this.scalars = Object.values(editorJson['nodes'] as Array<Node>)
                .filter(node => node.name === 'Scalar')
                .map(node => new ScalarView(
                    node.data.value[0],
                    node.data.color.visible ? node.data.color.color : null,
                    node.data.pos,
                ));
        },

        updateCanvasSize(): void {
            if (this.lastViewportSize === null) {
                throw new Error('lastViewportSize was null');
            }
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
            if (!_.isNil(this.scene)) {
                (this.$refs.renderer as any).inst.render((this.scene as any).inst, (this.$refs.camera as any).inst);
            }
        },

        expandThis(): void {
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
#app .viewport iframe {
    visibility: visible !important; /* This fixes getting 'resize' callbacks on Firefox */
}
</style>
