<template>
  <div class="viewport">
    <vgl-renderer :scene="scene" :camera="view" antialias style="height: 100%; flex: 1;">
      <template v-if="view === 'free'">
        <vgl-perspective-camera :name="view" :orbit-position="orbit_pos" />
      </template>
      <template v-else>
        <!-- TODO how to get zoom to fill viewport like perspective camera does? -->
        <vgl-orthographic-camera :name="view" zoom="10" :orbit-position="orbit_pos" />
      </template>
    </vgl-renderer>
    <span class="viewport-label">{{view | capitalize}}</span>
  </div>
</template>

<script>
import * as THREE from 'three';

export default {
    props: [
        'view', // 'side', 'front', 'top', or 'free'
        'scene',
    ],
    data() {
        return {
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
        }
    },
};
</script>

<style>
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
