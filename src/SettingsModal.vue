<template>
<modal name="settings-modal" classes="modal-body" @closed="closed">
  <md-button class="close-button md-icon-button" @click="close">
    <md-icon>close</md-icon>
  </md-button>
  <h4>Settings</h4>

  <form id="settings-form">
    <!-- TODO make selected tab a URL param? -->
    <md-tabs>

      <md-tab md-label="Viewport">
        <md-checkbox v-model="settings.viewport_settings.showAxis" @change="save">Show axis</md-checkbox>
        <md-checkbox v-model="settings.viewport_settings.showGrid" @change="save">Show grid</md-checkbox>
      </md-tab>

      <!-- TODO The modal resizes when I change tabs, can I avoid that? -->
      <md-tab md-label="Node Editor">
        <color-picker-setting v-model="settings.node_editor_settings.defaultScalarColor" @input="save">Default scalar color</color-picker-setting>
        <color-picker-setting v-model="settings.node_editor_settings.defaultVectorColor" @input="save">Default vector color</color-picker-setting>
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
            settingsUtil.saveSettings(this.settings['viewport_settings'], this.settings['node_editor_settings']);
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
