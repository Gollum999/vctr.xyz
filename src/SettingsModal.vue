<template>
<v-card>
  <!-- TODO would be nice to be able to drag the settings window -->
  <v-card-title>
    <v-btn text fab small class="close-button" @click="close">
      <v-icon>close</v-icon>
    </v-btn>
    Settings
  </v-card-title>

  <form id="settings-form">
    <!-- TODO make selected tab a URL param? -->
    <v-tabs>

      <v-tab>Viewport</v-tab>
      <v-tab>Node Editor</v-tab>

      <v-tab-item>
        <v-subheader class="text--secondary">Common Settings</v-subheader>
        <v-switch class="first-switch" color="primary" v-model="viewportSettings.values.showAxis" label="Show axis" hide-details />
        <v-switch color="primary" v-model="viewportSettings.values.showGrid" label="Show grid" hide-details />

        <v-divider class="mt-4" />
        <v-subheader class="mt-2 text--secondary">Scalar Rendering</v-subheader>
        <v-select :items="Object.values(ScalarRenderStyle)" v-model="viewportSettings.values.scalar.renderStyle" outlined hide-details />

        <v-divider class="mt-4" />
        <v-subheader class="mt-2 text--secondary">Vector Rendering</v-subheader>
        <v-slider step="0.1" min="0.0" max="1" label="Head Size" v-model.number="vectorHeadSize"
                  @change="updateViewportSetting('vector.headSize', $event)">
          <template v-slot:append>
            {{vectorHeadSize | formatSliderValue}}
          </template>
        </v-slider>

        <v-divider/>
        <v-subheader class="mt-2 text--secondary">Matrix Rendering</v-subheader>
        <!-- Keep a separate model for these so we get high precision for "live" updates, but only trigger watchers from specific events -->
        <v-slider step="0.1" min="0.1" max="1" label="Vector Scale" v-model.number="vectorScale"
                  @change="updateViewportSetting('matrix.vectorScale', $event)">
          <template v-slot:append>
            {{vectorScale | formatSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="1" :max="fieldSizeMax" label="Field Size" v-model.number="fieldSize"
                  @change="updateViewportSetting('matrix.fieldSize', $event)">
          <template v-slot:append>
            {{fieldSize | formatSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="0.1" :max="fieldDensityMax" label="Field Density" v-model.number="fieldDensity"
                  @change="updateViewportSetting('matrix.fieldDensity', $event)">
          <template v-slot:append>
            {{fieldDensity | formatSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="0.0" max="1" label="Vector Head Size" v-model.number="matrixHeadSize" hide-details
                  @change="updateViewportSetting('matrix.headSize', $event)">
          <template v-slot:append>
            {{matrixHeadSize | formatSliderValue}}
          </template>
        </v-slider>
      </v-tab-item>

      <!-- TODO size jumps a bit after changing to this tab -->
      <v-tab-item>
        <!-- TODO add settings to default 'visible' state per value type -->
        <v-switch color="primary" v-model="nodeEditorSettings.values.useRandomColors" label="Use random colors" />
        <color-picker-setting :disabled="nodeEditorSettings.values.useRandomColors" disableAlpha
                              v-model="nodeEditorSettings.values.defaultScalarColor">
          <span :class="{ 'text--disabled': nodeEditorSettings.values.useRandomColors }">Default scalar color</span>
        </color-picker-setting>
        <color-picker-setting :disabled="nodeEditorSettings.values.useRandomColors" disableAlpha
                              v-model="nodeEditorSettings.values.defaultVectorColor">
          <span :class="{ 'text--disabled': nodeEditorSettings.values.useRandomColors }">Default vector color</span>
        </color-picker-setting>
        <color-picker-setting :disabled="nodeEditorSettings.values.useRandomColors" disableAlpha
                              v-model="nodeEditorSettings.values.defaultMatrixColor">
          <span :class="{ 'text--disabled': nodeEditorSettings.values.useRandomColors }">Default matrix color</span>
        </color-picker-setting>
      </v-tab-item>

    </v-tabs>
  </form>
</v-card>
</template>

<script lang="ts">
import Vue from 'vue';
import * as settingsUtil from './settings';
import ColorPickerSetting from './ColorPickerSetting.vue';
import * as util from './util';

const MAX_VECTORS_PER_SIDE = 11; // Heuristic to prevent slowing things down too much
const ALL_SETTINGS_KEYS = new Set(Object.keys(util.flattenKeys({
    viewportSettings: settingsUtil.viewportSettings,
    nodeEditorSettings: settingsUtil.nodeEditorSettings,
})).filter(key => key.includes('.values.')));
const IGNORE_SETTINGS_KEYS = new Set([
]);
const HANDLE_HISTORY_SETTINGS_KEYS = util.difference(ALL_SETTINGS_KEYS, IGNORE_SETTINGS_KEYS);

export default Vue.extend({
    name: 'SettingsModal',
    components: {
        'color-picker-setting': ColorPickerSetting,
    },
    data() {
        // console.log('SettingsModal data() settingsUtil', settingsUtil);
        return {
            nodeEditorSettings: settingsUtil.nodeEditorSettings,
            viewportSettings: settingsUtil.viewportSettings,
            ScalarRenderStyle: settingsUtil.ScalarRenderStyle,

            vectorHeadSize: settingsUtil.viewportSettings.values.vector.headSize,

            vectorScale: settingsUtil.viewportSettings.values.matrix.vectorScale,
            fieldSize: settingsUtil.viewportSettings.values.matrix.fieldSize,
            fieldDensity: settingsUtil.viewportSettings.values.matrix.fieldDensity,
            matrixHeadSize: settingsUtil.viewportSettings.values.matrix.headSize,
        };
    },
    filters: {
        formatSliderValue(value: number): string {
            return value.toFixed(1);
        },
    },
    watch: {
        ...Object.fromEntries([...HANDLE_HISTORY_SETTINGS_KEYS].map(function (this: any, key: string) {
            const handler = function (this: any, newVal: any, oldVal: any) {
                this.nodeEditorSettings.save();
                this.viewportSettings.save();
            };
            return [key, handler];
        })),
    },
    computed: {
        // 2 * fieldSize * fieldDensity <= MAX_VECTORS_PER_SIDE
        fieldSizeMax(): string {
            return (MAX_VECTORS_PER_SIDE / (this.viewportSettings.values.matrix.fieldDensity * 2)).toFixed(1);
        },
        fieldDensityMax(): string {
            return (MAX_VECTORS_PER_SIDE / (this.viewportSettings.values.matrix.fieldSize * 2)).toFixed(1);
        },
    },
    mounted() {
        console.log('SettingsModal mounted');
        console.log('  nodeEditorSettings: ', this.nodeEditorSettings);
        console.log('  viewportSettings: ', this.viewportSettings);
    },
    methods: {
        close() {
            this.$emit('settings-modal-closed');
        },
        updateNodeEditorSetting(key: string, value: any) {
            console.log('SettingsModal updating nodeEditorSetting', key, value);
            this.nodeEditorSettings.update(key, value);
        },
        updateViewportSetting(key: string, value: any) {
            console.log('SettingsModal updating viewportSetting', key, value);
            this.viewportSettings.update(key, value);
        },
    },
});
</script>

<style scoped>
.v-input.v-input--switch.first-switch {
    margin-top: 0;
}
.close-button {
    position: absolute;
    top: 0;
    right: 0;
    margin: 0;
}
.v-tab {
    display: flex;
    flex-direction: column;
}
</style>

<style>
.v-tabs-items {
    padding: 16px;
}
</style>
