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
        <v-switch color="primary" v-model="settings.viewportSettings.showAxis" @change="save" label="Show axis" hide-details></v-switch>
        <v-switch color="primary" v-model="settings.viewportSettings.showGrid" @change="save" label="Show grid" hide-details></v-switch>

        <v-subheader>Matrix Rendering</v-subheader>
        <v-slider step="0.1" min="0.1" max="1" @end="save" label="Vector Scale" v-model.number="settings.viewportSettings.matrix.vectorScale">
          <template v-slot:append>
            {{settings.viewportSettings.matrix.vectorScale}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="1" max="20" @end="save" label="Field Size" v-model.number="settings.viewportSettings.matrix.fieldSize">
          <template v-slot:append>
            {{settings.viewportSettings.matrix.fieldSize}}
          </template>
        </v-slider>
        <v-slider step="0.1" min="0.1" max="2" @end="save" label="Field Density" v-model.number="settings.viewportSettings.matrix.fieldDensity">
          <template v-slot:append>
            {{settings.viewportSettings.matrix.fieldDensity}}
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
        <color-picker-setting v-model="settings.nodeEditorSettings.defaultScalarColor" @input="save" disableAlpha>
          Default scalar color
        </color-picker-setting>
        <color-picker-setting v-model="settings.nodeEditorSettings.defaultVectorColor" @input="save" disableAlpha>
          Default vector color
        </color-picker-setting>
        <color-picker-setting v-model="settings.nodeEditorSettings.defaultMatrixColor" @input="save" disableAlpha>
          Default matrix color
        </color-picker-setting>
      </v-tab-item>

    </v-tabs>
  </form>
</v-card>
</template>

<script>
import settingsUtil from './settings';
import { EventBus } from './EventBus';
import ColorPickerSetting from './ColorPickerSetting';

export default {
    name: 'SettingsModal',
    components: {
        'color-picker-setting': ColorPickerSetting,
    },
    data() {
        return {
            settings: settingsUtil.loadSettings(),
        };
    },
    methods: {
        save(event) {
            console.log('SettingsModal saving settings', this.settings);
            settingsUtil.saveSettings(this.settings['viewportSettings'], this.settings['nodeEditorSettings']);
            EventBus.$emit('settings-updated');
        },
        close() {
            this.$emit('settings-modal-closed');
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
