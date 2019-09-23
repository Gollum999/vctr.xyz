<template>
<div>
  <div v-if="displayType === 'vector-field'">
    <!-- TODO is 'key' supposed to be globally unique, or just within component? -->
    <!-- TODO if I stick with no arrow heads, is there a "line helper" or something that is more efficient? -->
    <!-- TODO would it be more performant to calculate things like vector length and string versions inside `fieldVectors`? -->
    <vgl-arrow-helper v-for="(v, idx) in fieldVectors"
                      :key="`matrix-field-vector-${idx}`"
                      :position="`${v.pos[0]} ${v.pos[1]} ${v.pos[2]}`"
                      :dir="`${v.value[0]} ${v.value[1]} ${v.value[2]}`"
                      :color="color"
                      :length="`${vec3.length(v.value) * vectorScale}`"
                      :head-length="0.15"
                      :head-width="0.15"
    />
  </div>
</div>
</template>

<script>
import { mat4, vec3 } from 'gl-matrix';

class FieldVector {
    constructor(value, pos) {
        this.value = value;
        this.pos = pos;
    }
};

export default {
    props: {
        displayType:   { type: String, required: true },

        value:         { /* type: mat4, */ required: true },
        color:         { type: String, default: '#ff0000' },
        pos:           { type: Array,  default: () => vec3.create() },

        vectorScale:   { type: Number, default: 0.2 },
        density:       { type: Number, default: 0.5 },
        fieldSize:     { type: Number, default: 7.0 }, // TODO should this be distance in world coords, or the total count of vectors per side?  if in world coords, should I use size of one direction or both combined?
    },
    data() {
        return {
            vec3: vec3,
        };
    },
    computed: {
        fieldVectors() {
            const vectorsPerAxis = this.fieldSize * 2 * this.density; // Include both sides
            const bounds = Math.floor(vectorsPerAxis) / 2.0;
            const spacing = 1.0 / this.density;
            console.log('fieldVectors vectorsPerAxis:', vectorsPerAxis, 'bounds:', bounds, 'spacing:', spacing);

            const vectors = [];
            // TODO Is there a way to simplify this with a single matrix multiplication?
            for (let xIdx = -bounds; xIdx <= bounds; xIdx += 1) {
                for (let yIdx = -bounds; yIdx <= bounds; yIdx += 1) {
                    for (let zIdx = -bounds; zIdx <= bounds; zIdx += 1) {
                        /* console.log('processing x:', xIdx, 'y:', yIdx, 'z:', zIdx); */
                        const out = vec3.create();
                        const baseVec = vec3.fromValues(xIdx * spacing, yIdx * spacing, zIdx * spacing);
                        const transposed = mat4.create();
                        mat4.transpose(transposed, this.value); // gl-matrix is column-major, but I am row-major; transpose before calculating
                        vec3.transformMat4(out, baseVec, transposed);
                        /* console.log('adding vector', out, baseVec, this.value); */
                        const pos = vec3.create();
                        vectors.push(new FieldVector(out, vec3.add(pos, this.pos, baseVec)));
                    }
                }
            }
            /* console.log('returning fieldVectors:', vectors); */
            return vectors;
        },
    },
    mounted() {
        console.log('Matrix mounted:', this.displayType, this.value, this.color, this.vectorScale, this.density, this.fieldSize);
    },
};
</script>

<style scoped>
</style>
