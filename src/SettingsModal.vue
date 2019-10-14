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
        <!-- TODO use switch instead of checkbox? -->
        <v-switch color="primary" v-model="settings.viewportSettings.showAxis" label="Show axis" hide-details />
        <v-switch color="primary" v-model="settings.viewportSettings.showGrid" label="Show grid" hide-details />

        <v-subheader>Matrix Rendering</v-subheader>
        <!-- Keep a separate model for these so we get high precision for "live" updates, but only trigger watchers from specific events -->
        <v-slider step="0.1" min="0.1" max="1" label="Vector Scale" v-model.number="vectorScale"
                  @change="updateSetting('settings.viewportSettings.matrix.vectorScale', $event)">
          <template v-slot:append>
            {{vectorScale | formatMatrixSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="1" :max="fieldSizeMax" label="Field Size" v-model.number="fieldSize"
                  @change="updateSetting('settings.viewportSettings.matrix.fieldSize', $event)">
          <template v-slot:append>
            {{fieldSize | formatMatrixSliderValue}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="0.1" :max="fieldDensityMax" label="Field Density" v-model.number="fieldDensity"
                  @change="updateSetting('settings.viewportSettings.matrix.fieldDensity', $event)">
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
        <v-switch color="primary" v-model="settings.nodeEditorSettings.useRandomColors" label="Use random colors" hide-details></v-switch>
        <color-picker-setting :disabled="settings.nodeEditorSettings.useRandomColors" disableAlpha
                              v-model="settings.nodeEditorSettings.defaultScalarColor">
          Default scalar color
        </color-picker-setting>
        <color-picker-setting :disabled="settings.nodeEditorSettings.useRandomColors" disableAlpha
                              v-model="settings.nodeEditorSettings.defaultVectorColor">
          Default vector color
        </color-picker-setting>
        <color-picker-setting :disabled="settings.nodeEditorSettings.useRandomColors" disableAlpha
                              v-model="settings.nodeEditorSettings.defaultMatrixColor">
          Default matrix color
        </color-picker-setting>
        <!-- TODO add confirm dialog when toggling this off, since doing so will remove some controls -->
        <v-switch color="primary" v-model="settings.nodeEditorSettings.showAdvancedRenderSettings" label="Show advanced render settings" hide-details />
      </v-tab-item>

    </v-tabs>
  </form>
</v-card>
</template>

<script>
import _ from 'lodash';
import settingsUtil from './settings';
import { EventBus } from './EventBus';
import ColorPickerSetting from './ColorPickerSetting';
import { FieldChangeAction } from './util';

const MAX_VECTORS_PER_SIDE = 11; // Heuristic to prevent slowing things down too much

export default {
    name: 'SettingsModal',
    components: {
        'color-picker-setting': ColorPickerSetting,
    },
    data() {
        const settings = settingsUtil.loadSettings();
        return {
            settings,

            vectorScale: settings.viewportSettings.matrix.vectorScale,
            fieldSize: settings.viewportSettings.matrix.fieldSize,
            fieldDensity: settings.viewportSettings.matrix.fieldDensity,
        };
    },
    filters: {
        formatMatrixSliderValue(value) {
            return value.toFixed(1);
        },
    },
    watch: {
        ...Object.fromEntries([
            'settings.viewportSettings.showAxis',
            'settings.viewportSettings.showGrid',
            'settings.viewportSettings.matrix.colorStyle',
            'settings.viewportSettings.matrix.vectorScale',
            'settings.viewportSettings.matrix.fieldSize',
            'settings.viewportSettings.matrix.fieldDensity',
            'settings.nodeEditorSettings.useRandomColors',
            'settings.nodeEditorSettings.defaultScalarColor',
            'settings.nodeEditorSettings.defaultVectorColor',
            'settings.nodeEditorSettings.defaultMatrixColor',
            'settings.nodeEditorSettings.showAdvancedRenderSettings',
        ].map(function (key) {
            const handler = function (newVal, oldVal) {
                // Bit of a hack -- using Rete's 'History' plugin even for non-Rete undo/redo
                EventBus.$emit('addhistory', new FieldChangeAction(oldVal, newVal, val => {
                    _.set(this, key, val);
                }));

                this.save(newVal);
            };
            return [key, handler];
        })),
    },
    computed: {
        // 2 * fieldSize * fieldDensity <= MAX_VECTORS_PER_SIDE
        fieldSizeMax() {
            return (MAX_VECTORS_PER_SIDE / (this.settings.viewportSettings.matrix.fieldDensity * 2)).toFixed(1);
        },
        fieldDensityMax() {
            return (MAX_VECTORS_PER_SIDE / (this.settings.viewportSettings.matrix.fieldSize * 2)).toFixed(1);
        },
    },
    methods: {
        save(newValue) {
            console.log('SettingsModal saving settings', this.settings);
            settingsUtil.saveSettings(this.settings['viewportSettings'], this.settings['nodeEditorSettings']);
            EventBus.$emit('settings-updated');
        },
        close() {
            this.$emit('settings-modal-closed');
        },
        updateSetting(key, value) {
            _.set(this, key, value);
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
