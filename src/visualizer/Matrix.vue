<template>
<div>
  <div v-if="displayType === 'vector-field'">
    <!-- TODO would it be more performant to calculate things like vector length and string versions inside of `fieldVectors`? -->
    <vgl-arrow-helper v-for="(v, idx) in fieldVectors"
                      :key="`matrix-field-vector-${idx}`"
                      :position="`${v.pos[0]} ${v.pos[1]} ${v.pos[2]}`"
                      :dir="`${v.value[0]} ${v.value[1]} ${v.value[2]}`"
                      :color="color"
                      :length="`${vec3.length(v.value) * vectorScale}`"
                      :head-length="settings.values.matrix.headSize"
                      :head-width="settings.values.matrix.headSize"
    />
  </div>
</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import { mat4, vec3 } from 'gl-matrix';
import * as settings from '../settings';

class FieldVector {
    constructor(public value: vec3, public pos: vec3) {
        this.value = value;
        this.pos = pos;
    }
};

export default Vue.extend({
    props: {
        displayType:   { type: String, required: true },

        value:         { type: Array as unknown as PropType<mat4>, required: true },
        color:         { type: String, default: '#ff0000' },
        pos:           { type: Array as unknown as PropType<vec3>, default: () => vec3.create() },

        vectorScale:   { type: Number, default: 0.2 },
        density:       { type: Number, default: 0.5 },
        fieldSize:     { type: Number, default: 7.0 },
    },
    data() {
        return {
            settings: settings.viewportSettings,
            vec3: vec3,
        };
    },
    computed: {
        fieldVectors(): Array<FieldVector> {
            const vectorsPerAxis: number = this.fieldSize * 2.0 * this.density; // Include both sides
            const bounds = Math.floor(vectorsPerAxis) / 2.0;
            const spacing = 1.0 / this.density;

            const vectors = [];
            // TODO Is there a way to simplify this with a single matrix multiplication?
            for (let xIdx = -bounds; xIdx <= bounds; xIdx += 1) {
                for (let yIdx = -bounds; yIdx <= bounds; yIdx += 1) {
                    for (let zIdx = -bounds; zIdx <= bounds; zIdx += 1) {
                        const out = vec3.create();
                        const baseVec = vec3.fromValues(xIdx * spacing, yIdx * spacing, zIdx * spacing);
                        const transposed = mat4.create();
                        mat4.transpose(transposed, this.value); // gl-matrix is column-major, but I am row-major; transpose before calculating
                        vec3.transformMat4(out, baseVec, transposed);
                        if (vec3.length(out) <= 1e-6) {
                            // 0-length vectors cause console warnings because the matrix can't be inverted for rendering
                            continue;
                        }
                        const pos = vec3.create();
                        vectors.push(new FieldVector(out, vec3.add(pos, this.pos, baseVec)));
                    }
                }
            }
            return vectors;
        },
    },
});
</script>

<style scoped>
</style>
