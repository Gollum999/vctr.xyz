<template>
<div class="modal-background" @click.prevent.stop="close">
  <div class="modal-body" @click.prevent.stop>
    <md-button class="close-button md-icon-button" @click.prevent.stop="close">
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

  </div>
</div>
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
            settingsUtil.saveSettings(this.settings['viewport_settings'], this.settings['node_editor_settings']);
            EventBus.$emit('settings-updated');
        },
        close() {
            this.$router.back();
        },
    },
};
</script>

<style scoped>
.modal-background {
    position: fixed;
    top: 0;
    left: 0;
    background-color: rgba(50, 50, 50, 0.5);
    height: 100vh;
    width: 100vw;
    z-index: 8; /* md-button uses z-index 5 */
    display: flex;
    justify-content: center;
    align-items: center;
}
.modal-body {
    display: inline-block;
    background-color: white;
    flex: none;
}
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
