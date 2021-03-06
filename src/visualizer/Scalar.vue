<template>
<div>
  <vgl-icosahedron-geometry :name="`scalar-geo-${this.scalarKey}`" :radius="geoRadius" detail="2" />
  <vgl-mesh-basic-material
      :ref="`scalar-mat-${this.scalarKey}-${ScalarRenderStyle.SPHERE}`"
      :name="`scalar-mat-${this.scalarKey}-${ScalarRenderStyle.SPHERE}`"
      :color="color"
  />
  <vgl-shader-material
      :ref="`scalar-mat-${this.scalarKey}-${ScalarRenderStyle.CIRCLE}`"
      :name="`scalar-mat-${this.scalarKey}-${ScalarRenderStyle.CIRCLE}`"
      :uniforms="uniforms"
      :vertex-shader="vertexShader"
      :fragment-shader="fragmentShader"
  />
  <vgl-mesh
      :ref="`scalar-mesh-${this.scalarKey}`"
      :geometry="`scalar-geo-${this.scalarKey}`"
      :material="`scalar-mat-${this.scalarKey}-${this.displayType}`"
      :position="`${pos[0]} ${pos[1]} ${pos[2]}`"
  />
</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import * as util from '../util';
import { vec3 } from 'gl-matrix';
import { ScalarRenderStyle } from '../settings';

type CanvasSize = { x: number, y: number };

function colorObjToArray(color: util.Color): [number, number, number, number] {
    return [color.r / 256.0, color.g / 256.0, color.b / 256.0, 1.0]; // TODO do I want to support alpha?
}

export default Vue.extend({
    props: {
        scalarKey:     { type: String, required: true },
        displayType:   { type: String, required: true },
        layer:         { type: Number, default: 0 },
        pos:           { type: Array as unknown as PropType<vec3>, default: () => vec3.create() },

        value:         { type: Number, required: true },
        color:         { type: String, default: '#000000' },
        canvasSize:    { type: Object as PropType<CanvasSize>, required: true },
        lineThickness: { type: Number, default: 0.1 },
        numSegments:   { type: Number, default: 12.0 },
        segmentRatio:  { type: Number, default: 0.65 },
    },

    watch: {
        // For some reason, if 'uniforms' is a computed property, uniforms in shader do not seem to react to changes
        value(newVal: number, oldVal: number) {
            this.uniforms.radius.value = Math.abs(newVal);
        },
        color(newVal: string, oldVal: string) {
            const rgb = util.hexToRgb(newVal);
            if (rgb === null) {
                throw new Error(`Could not convert string "${newVal}" to RGB`);
            }
            this.uniforms.color.value = colorObjToArray(rgb);
        },
        lineThickness(newVal: number, oldVal: number) {
            this.uniforms.lineThickness.value = newVal;
        },
        canvasSize(newVal: CanvasSize, oldVal: CanvasSize) {
            this.uniforms.canvasSize.value = [newVal.x, newVal.y];
        },
    },

    computed: {
        geoRadius(): number {
            if (this.displayType === ScalarRenderStyle.SPHERE) {
                return Math.abs(this.value);
            } else if (this.displayType === ScalarRenderStyle.CIRCLE) {
                // Be careful of near plane clipping
                // Also make sure to account for "chords" that can cause clipping since sphere mesh is not a perfect circle
                // TODO a "billboard" plane is probably the better solution
                const PADDING = 0.5; // A little bit extra to prevent clipping due to camera distortion at close distances
                return Math.abs(this.value) + this.lineThickness / 2.0 + PADDING;
            } else {
                throw new Error(`Invalid displayType ${this.displayType}`);
            }
        },
    },

    data() {
        const colorObj = util.hexToRgb(this.color);
        if (colorObj === null) {
            throw new Error('Color was null');
        }
        return {
            ScalarRenderStyle,

            uniforms: {
                radius:                         { value: Math.abs(this.value) },
                color:                          { value: colorObjToArray(colorObj) },
                canvasSize:                     { value: [this.canvasSize.x, this.canvasSize.y] },
                lineThickness:                  { value: this.lineThickness },
                numSegments:                    { value: this.numSegments },
                segmentRatio:                   { value: this.segmentRatio },
                lineThicknessScaleWithDistance: { value: true }, // TODO broken if 'false'
            },

            // TODO my shader doesn't account for perspective distortion, so the radius it shows becomes less accurate the farther it is from the origin
            vertexShader: `
                varying vec4 objectPos;
                varying mat4 projMat;

                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    objectPos = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
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

                const float PI = ${Math.PI};

                float calculateRadiusScreenSpace(float radiusWorld) {
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
                        // TODO not quite right, and does not work with ortho
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
        (this.$refs[`scalar-mesh-${this.scalarKey}`] as any).inst.layers.set(this.layer);
        (this.$refs[`scalar-mat-${this.scalarKey}-${ScalarRenderStyle.SPHERE}`] as any).inst.wireframe = true;
    },
});
</script>

<style scoped>
</style>
