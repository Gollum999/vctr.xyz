<template>
<div>
  <div v-if="displayType === 'circle'">
    <vgl-icosahedron-geometry :name="`scalar-geo-${this.idx}`" :radius="geoRadius" detail="2" />
    <!-- TODO is ref necessary? -->
    <vgl-shader-material
        :ref="`scalar-mat-${this.idx}`"
        :name="`scalar-mat-${this.idx}`"
        :uniforms="uniforms"
        :vertex-shader="vertexShader"
        :fragment-shader="fragmentShader"
    />
    <vgl-mesh :geometry="`scalar-geo-${this.idx}`" :material="`scalar-mat-${this.idx}`" :position="pos" />
  </div>
</div>
</template>

<script>
import VglShaderMaterial from './ShaderMaterial.js';
export default {
    components: {'vgl-shader-material': VglShaderMaterial},
    props: {
        idx:           { type: Number, required: true },
        displayType:   { type: String, required: true },
        pos:           { type: String, default: '0 0 0' }, // TODO I think to support this I need to use a vgl "billboard"

        value:         { type: Number, required: true },
        color:         { type: Object, default: () => ({r: 255, g: 0, b: 0}) },
        canvasSize:    { type: Object, required: true },
        lineThickness: { type: Number, default: 0.1 },
        numSegments:   { type: Number, default: 12.0 },
        segmentRatio:  { type: Number, default: 0.65 },
    },
    watch: {
        // For some reason, if 'uniforms' is a computed property, uniforms in shader don't seem to react to changes
        value(newVal, oldVal) {
            /* console.log('value updated', oldVal, newVal); */
            this.uniforms.radius.value = newVal;
        },
        color(newVal, oldVal) {
            /* console.log('color updated', oldVal, newVal); */
            this.uniforms.color.value = this.colorObjToArray(newVal);
        },
        lineThickness(newVal, oldVal) {
            /* console.log('lineThickness updated', oldVal, newVal); */
            this.uniforms.lineThickness.value = newVal;
        },
    },
    computed: {
        geoRadius() {
            // TODO be careful of near plane clipping
            // TODO a "billboard" plane is probably the better solution
            /* console.log('calculating geo radius', this); */
            const PADDING = 0.5; // A little bit extra to prevent clipping due to camera distortion at close distances // TODO also need to account for "chords" since sphere mesh is not a perfect circle
            return this.value + this.lineThickness / 2.0 + PADDING;
        },
    },
    methods: {
        colorObjToArray(color) {
            return [color.r / 256.0, color.g / 256.0, color.b / 256.0, color.a];
        },
    },
    data() {
        return {
            uniforms: {
                radius:                         { value: this.value },
                color:                          { value: this.colorObjToArray(this.color) },
                canvasSize:                     { value: [this.canvasSize.x, this.canvasSize.y] },
                lineThickness:                  { value: this.lineThickness },
                numSegments:                    { value: this.numSegments },
                segmentRatio:                   { value: this.segmentRatio },
                lineThicknessScaleWithDistance: { value: true }, // TODO broken
            },
            vertexShader: `
                varying vec4 objectPos;
                varying mat4 projMat;

                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    objectPos = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); // TODO I can't remember the math here; can I drop the 0,0,0?
                    projMat = projectionMatrix;
                }
            `,
            fragmentShader: `
                varying vec4 objectPos;
                varying mat4 projMat;

                uniform float radius;
                uniform vec4 color;

                uniform vec2 canvasSize;
                uniform float lineThickness;
                uniform int numSegments;
                uniform float segmentRatio;
                uniform bool lineThicknessScaleWithDistance;

                // TODO common place for these utility things? Call into JS Math module?
                const float PI = 3.1415926536;

                float calculateRadiusScreenSpace(float radiusWorld) {
                    // TODO just pull out the one or two values that matter from the matrix
                    float radiusClipSpace = (projMat * vec4(radiusWorld, 0.0, 0.0, 1.0)).x; // Assumes a 1:1 pixel ratio
                    float radiusScreenSpace = radiusClipSpace / 2.0 * canvasSize.x;
                    return radiusScreenSpace;
                }

                void main() {
                    vec2 objectPosScreenSpace = ((objectPos.xy / objectPos.w) + vec2(1.0, 1.0)) / 2.0 * canvasSize;

                    float innerRadius = 0.0;
                    float outerRadius = 0.0;
                    if (lineThicknessScaleWithDistance) {
                        innerRadius = calculateRadiusScreenSpace((radius - lineThickness / 2.0) / objectPos.w);
                        outerRadius = calculateRadiusScreenSpace((radius + lineThickness / 2.0) / objectPos.w);
                    } else {
                        // TODO not quite right, and doesn't work with ortho
                        innerRadius = calculateRadiusScreenSpace((radius / objectPos.w - lineThickness / 2.0));
                        outerRadius = calculateRadiusScreenSpace((radius / objectPos.w + lineThickness / 2.0));
                    }

                    float fragR = length(gl_FragCoord.xy - objectPosScreenSpace);
                    float fragTheta = atan(gl_FragCoord.y - objectPosScreenSpace.y, gl_FragCoord.x - objectPosScreenSpace.x);
                    float segmentThetaWithGap = (2.0 * PI / float(numSegments));
                    float segmentTheta = segmentThetaWithGap * segmentRatio;

                    if (
                       innerRadius <= fragR && fragR <= outerRadius
                       && mod(fragTheta, segmentThetaWithGap) <= segmentTheta
                    ) {
                       gl_FragColor = color;
                    } else {
                       discard;
                    }
                }
            `,
        };
    },
    mounted() {
        /* console.log('Scalar mounted:', this.displayType, this.color, this.pos, this.value, this.circleStyle); */
    },
};
</script>

<style scoped>
</style>
