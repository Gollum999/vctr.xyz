<template>
<modal name="settings-modal" classes="modal-body" @closed="closed" height="auto">
  <md-button class="close-button md-icon-button" @click="close">
    <md-icon>close</md-icon>
  </md-button>
  <h4>Settings</h4>

  <form id="settings-form">
    <!-- TODO make selected tab a URL param? -->
    <md-tabs>

      <md-tab md-label="Viewport">
        <md-checkbox v-model="settings.viewportSettings.showAxis" @change="save">Show axis</md-checkbox>
        <md-checkbox v-model="settings.viewportSettings.showGrid" @change="save">Show grid</md-checkbox>

        <md-subheader>Matrix Rendering</md-subheader>
        <md-field>
          <label>Vector Scale</label>
          <md-input type="number" step="0.1" @change="save" v-model.number="settings.viewportSettings.matrix.vectorScale"></md-input>
        </md-field>
        <md-field>
          <label>Field Size</label>
          <md-input type="number" step="0.1" @change="save" v-model.number="settings.viewportSettings.matrix.fieldSize"></md-input>
        </md-field>
        <md-field>
          <label>Field Density</label>
          <md-input type="number" step="0.1" @change="save" v-model.number="settings.viewportSettings.matrix.fieldDensity"></md-input>
        </md-field>
        <!--
        <md-field>
          <md-select>
            <!-\- TODO need to figure out how to group these responsibility -\->
            <md-option>Solid</md-option>
            <md-option>Length</md-option>
          </md-select>
        </md-field>
        -->
      </md-tab>

      <!-- TODO The modal resizes when I change tabs, can I avoid that?  md-tabs-content is resizing programmatically -->
      <md-tab md-label="Node Editor">
        <color-picker-setting v-model="settings.nodeEditorSettings.defaultScalarColor" @input="save" disableAlpha>
          Default scalar color
        </color-picker-setting>
        <color-picker-setting v-model="settings.nodeEditorSettings.defaultVectorColor" @input="save" disableAlpha>
          Default vector color
        </color-picker-setting>
        <color-picker-setting v-model="settings.nodeEditorSettings.defaultMatrixColor" @input="save" disableAlpha>
          Default matrix color
        </color-picker-setting>
      </md-tab>

    </md-tabs>
  </form>

  <router-view />

</modal>
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
    mounted() {
        this.$modal.show('settings-modal');
    },
    methods: {
        save(event) {
            console.log('SettingsModal saving settings', this.settings);
            settingsUtil.saveSettings(this.settings['viewportSettings'], this.settings['nodeEditorSettings']);
            EventBus.$emit('settings-updated');
        },
        close() {
            this.$modal.hide('settings-modal');
        },
        closed() {
            this.$router.back();
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
.md-tab {
    display: flex;
    flex-direction: column;
}
.md-checkbox {
    margin-top: 8px;
    margin-bottom: 0px;
}
</style>

<style>
.modal-body {
    background-color: white;
}
</style>
