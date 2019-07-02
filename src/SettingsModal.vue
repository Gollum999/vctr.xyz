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
          <!-- TODO This should be a component -->
          <div class="color-picker-option">
            <md-menu
                class="color-picker"
                md-size="auto"
                md-direction="bottom-start"
                md-align-trigger
            >
              <div class="color-picker-button" :style="{'background-color': settings.node_editor_settings.defaultScalarColor.hex}" md-menu-trigger>
                <md-menu-content class="color-picker-popup">
                  <color-picker v-model="settings.node_editor_settings.defaultScalarColor" @input="save" disableAlpha />
                </md-menu-content>
              </div>
            </md-menu>
            <label class="color-picker-label">Default scalar color</label>
          </div>

          <div class="color-picker-option">
            <md-menu
                class="color-picker"
                md-size="auto"
                md-direction="bottom-start"
                md-align-trigger
            >
              <div class="color-picker-button" :style="{'background-color': settings.node_editor_settings.defaultVectorColor.hex}" md-menu-trigger>
                <md-menu-content class="color-picker-popup">
                  <color-picker v-model="settings.node_editor_settings.defaultVectorColor" @input="save" disableAlpha />
                </md-menu-content>
              </div>
            </md-menu>
            <label class="color-picker-label">Default vector color</label>
          </div>
        </md-tab>

      </md-tabs>
    </form>

    <router-view />

  </div>
</div>
</template>

<script>
import { Chrome } from 'vue-color';
import settingsUtil from './settings';
import { EventBus } from './EventBus';

export default {
    name: 'SettingsModal',
    components: {
        'color-picker': Chrome,
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
.color-picker-option {
    text-align: left;
}
.md-menu.color-picker {
    vertical-align: middle;
}
.color-picker-button {
    grid-column: controls;
    width: 20px;
    height: 20px;
    /* background-color: yellow; */
    border: 1px solid rgba(128, 128, 128, 0.4);
    margin: 8px 0px 8px 8px;
}
.color-picker-label {
    padding-left: 9px;
}
/* color-picker { */
/*     transform: none; */
/* } */
</style>

<style>
body .color-picker-popup {
    max-height: initial;
}
body .color-picker-popup .md-menu-content-container {
    border-radius: 2px; /* TODO Is there a good way to make this match value from md-card? */
}
body .color-picker-popup .md-list {
    padding-inline-start: initial;
    padding: initial;
}
</style>
