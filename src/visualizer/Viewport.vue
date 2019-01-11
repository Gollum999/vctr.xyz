<template>
  <div class="viewport">
    <vgl-renderer ref="renderer" :scene="scene" :camera="view" antialias style="height: 100%; flex: 1;">
      <template v-if="view === 'free'">
        <vgl-perspective-camera ref="camera" :name="view" :orbit-position="orbit_pos" />
      </template>
      <template v-else>
        <!-- TODO how to get zoom to fill viewport on window resize like perspective camera does? -->
        <vgl-orthographic-camera ref="camera" :name="view" :zoom="ortho_zoom" :orbit-position="orbit_pos" />
      </template>
    </vgl-renderer>
    <span class="viewport-label">{{view | capitalize}}</span>
  </div>
</template>

<script>
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);

function clamp(val, low, high) {
    return Math.max(low, Math.min(high, val));
}

export default {
    props: [
        'view', // 'side', 'front', 'top', or 'free'
        'scene',
    ],
    data() {
        return {
            zoom_speed: 1,
            zoom_min: 0,
            zoom_max: Infinity,
            ortho_zoom: 10,

            orbit_pos: (() => {
                var result = null;
                if (this.view === 'side') {
                    result = new THREE.Spherical(20, Math.PI / 2.0, Math.PI / 2.0);
                } else if (this.view === 'front') {
                    result = new THREE.Spherical(20, Math.PI / 2.0, 0);
                } else if (this.view === 'top') {
                    result = new THREE.Spherical(20, 0, 0);
                } else if (this.view === 'free') {
                    result = new THREE.Spherical(20, Math.PI / 4.0, Math.PI / 4.0);
                } else {
                    throw new Error('Viewport.view must be one of ["side", "front", "top", "free"]');
                }
                console.log(`Setting orbit_pos for "${this.view}" to "${result.radius} ${result.phi} ${result.theta}"`);
                return `${result.radius} ${result.phi} ${result.theta}`; // TODO can I avoid this string step?
            })(),
        };
    },
    filters: {
        capitalize(value) {
            if (!value) {
                return '';
            }
            value = value.toString();
            return value.charAt(0).toUpperCase() + value.slice(1);
        },
    },
    mounted() {
        console.log(`Viewport mounted ${this.view} ${this.scene}`);

        this.$refs.camera.inst.layers.set(0);
        if (this.view === 'free') {
            this.$refs.camera.inst.layers.enable(1);
        } else if (this.view === 'top') {
            this.$refs.camera.inst.layers.enable(2);
        } else if (this.view === 'front') {
            this.$refs.camera.inst.layers.enable(3);
        } else if (this.view === 'side') {
            this.$refs.camera.inst.layers.enable(4);
        }

        // TODO maybe separate these into two components
        if (this.view === 'free') {
            const controls = new OrbitControls(this.$refs.camera.inst, this.$refs.renderer.inst.domElement);
            controls.addEventListener('change', this.render); // call this only in static scenes (i.e., if there is no animation loop)
            // controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
            // controls.dampingFactor = 0.25;
            controls.screenSpacePanning = false;
            controls.minDistance = 4; // TODO should these match min/max orthog zoom?
            controls.maxDistance = 100;
            controls.maxPolarAngle = Math.PI / 2;
        } else {
            console.log(this.$refs.renderer);
            console.log(this.$refs);
            // TODO really should support panning and stuff too...
            this.$refs.renderer.inst.domElement.addEventListener('wheel', event => {
                event.preventDefault();
                event.stopPropagation();

                // TODO share zoom between viewports?
                if (event.deltaY < 0) {
                    this.zoomOut();
                } else if (event.deltaY > 0) {
                    this.zoomIn();
                }

                this.render();
            });
        }
    },
    methods: {
        render() {
            this.$refs.renderer.inst.render(this.$parent.$parent.$refs.scene.inst, this.$refs.camera.inst);
        },

        getZoomScale() {
            return Math.pow(0.95, this.zoom_speed);
        },

        zoomIn() {
            this.ortho_zoom = clamp(this.ortho_zoom * this.getZoomScale(), this.zoom_min, this.zoom_max);
        },

        zoomOut() {
            this.ortho_zoom = clamp(this.ortho_zoom / this.getZoomScale(), this.zoom_min, this.zoom_max);
        },

    },
};
</script>

<style scoped>
.viewport {
    position: relative;
    height: 100%;
}
.viewport-label {
    position: absolute;
    left: 0.4em;
    top: 0.2em;
    color: white;
}
</style>
