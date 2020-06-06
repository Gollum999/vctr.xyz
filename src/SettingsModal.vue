<template>
<v-card>
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

      <!-- TODO The modal resizes when I change tabs, can I avoid that? -->
      <v-tab-item>
        <v-switch color="primary" v-model="viewportSettings.values.showAxis" label="Show axis" hide-details />
        <v-switch color="primary" v-model="viewportSettings.values.showGrid" label="Show grid" hide-details />

        <v-subheader>Matrix Rendering</v-subheader>
        <!-- Keep a separate model for these so we get high precision for "live" updates, but only trigger watchers from specific events -->
        <v-slider step="0.1" min="0.1" max="1" label="Vector Scale" v-model.number="vectorScale"
                  @change="updateSetting('viewportSettings.values.matrix.vectorScale', $event)">
          <template v-slot:append>
            {{vectorScale | formatMatrixSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="1" :max="fieldSizeMax" label="Field Size" v-model.number="fieldSize"
                  @change="updateSetting('viewportSettings.values.matrix.fieldSize', $event)">
          <template v-slot:append>
            {{fieldSize | formatMatrixSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="0.1" :max="fieldDensityMax" label="Field Density" v-model.number="fieldDensity"
                  @change="updateSetting('viewportSettings.values.matrix.fieldDensity', $event)">
          <template v-slot:append>
            {{fieldDensity | formatMatrixSliderValue}}
          </template>
        </v-slider>
        <!--
        <md-field>
          <md-select>
            <!-\- TODO need to figure out how to group these responsibility -\->
            <md-option>Solid</md-option>
            <md-option>Length</md-option>
          </md-select>
        </md-field>
        -->
      </v-tab-item>

      <v-tab-item>
        <v-switch color="primary" v-model="nodeEditorSettings.values.useRandomColors" label="Use random colors" hide-details></v-switch>
        <color-picker-setting :disabled="nodeEditorSettings.values.useRandomColors" disableAlpha
                              v-model="nodeEditorSettings.values.defaultScalarColor">
          Default scalar color
        </color-picker-setting>
        <color-picker-setting :disabled="nodeEditorSettings.values.useRandomColors" disableAlpha
                              v-model="nodeEditorSettings.values.defaultVectorColor">
          Default vector color
        </color-picker-setting>
        <color-picker-setting :disabled="nodeEditorSettings.values.useRandomColors" disableAlpha
                              v-model="nodeEditorSettings.values.defaultMatrixColor">
          Default matrix color
        </color-picker-setting>
      </v-tab-item>

    </v-tabs>
  </form>
</v-card>
</template>

<script>
import settingsUtil from './settings';
import ColorPickerSetting from './ColorPickerSetting';
import util from './util';

const MAX_VECTORS_PER_SIDE = 11; // Heuristic to prevent slowing things down too much
const ALL_SETTINGS_KEYS = new Set([ // TODO Can I get this dynamically?
    'viewportSettings.values.showAxis',
    'viewportSettings.values.showGrid',
    'viewportSettings.values.matrix.colorStyle',
    'viewportSettings.values.matrix.vectorScale',
    'viewportSettings.values.matrix.fieldSize',
    'viewportSettings.values.matrix.fieldDensity',
    'nodeEditorSettings.values.useRandomColors',
    'nodeEditorSettings.values.defaultScalarColor',
    'nodeEditorSettings.values.defaultVectorColor',
    'nodeEditorSettings.values.defaultMatrixColor',
]);
const IGNORE_SETTINGS_KEYS = new Set([
]);
const HANDLE_HISTORY_SETTINGS_KEYS = util.difference(ALL_SETTINGS_KEYS, IGNORE_SETTINGS_KEYS);

export default {
    name: 'SettingsModal',
    components: {
        'color-picker-setting': ColorPickerSetting,
    },
    data() {
        // console.log('SettingsModal data() settingsUtil', settingsUtil);
        return {
            nodeEditorSettings: settingsUtil.nodeEditorSettings,
            viewportSettings: settingsUtil.viewportSettings,

            vectorScale: settingsUtil.viewportSettings.values.matrix.vectorScale,
            fieldSize: settingsUtil.viewportSettings.values.matrix.fieldSize,
            fieldDensity: settingsUtil.viewportSettings.values.matrix.fieldDensity,
        };
    },
    filters: {
        formatMatrixSliderValue(value) {
            return value.toFixed(1);
        },
    },
    watch: {
        ...Object.fromEntries([...HANDLE_HISTORY_SETTINGS_KEYS].map(function (key) {
            const handler = function (newVal, oldVal) {
                this.nodeEditorSettings.save();
                this.viewportSettings.save();
            };
            return [key, handler];
        })),
    },
    computed: {
        // 2 * fieldSize * fieldDensity <= MAX_VECTORS_PER_SIDE
        fieldSizeMax() {
            return (MAX_VECTORS_PER_SIDE / (this.viewportSettings.values.matrix.fieldDensity * 2)).toFixed(1);
        },
        fieldDensityMax() {
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
        updateNodeEditorSetting(key, value) {
            console.log('SettingsModal updating nodeEditorSetting', key, value);
            this.nodeEditorSettings.update(key, value);
        },
        updateViewportSetting(key, value) {
            console.log('SettingsModal updating viewportSetting', key, value);
            this.viewportSettings.update(key, value);
        },
        updateSetting(key, value) {
            // TODO clean this up
            const trimmed = key.split('.').slice(2).join('.');
            if (key.startsWith('viewportSettings')) {
                this.updateViewportSetting(trimmed, value);
            } else if (key.startsWith('nodeEditorSettings')) {
                this.updateNodeEditorSetting(trimmed, value);
            } else {
                throw new Error(`Invalid settings key ${key}`);
            }
        },
    },
};
</script>

<style scoped>
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
