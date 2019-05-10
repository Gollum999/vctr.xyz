<template>
<div class="modal-background" @click.prevent.stop="close">
  <div class="modal-body" @click.prevent.stop>
    <md-button class="close-button md-icon-button" @click.prevent.stop="close">
      <md-icon>close</md-icon>
    </md-button>
    <h4>Settings</h4>

    <form id="settings-form">
      <md-tabs>

        <md-tab md-label="Viewport">
          <md-checkbox v-model="viewportSettings.showAxis" @change="save">Show axis</md-checkbox>
          <md-checkbox v-model="viewportSettings.showGrid" @change="save">Show grid</md-checkbox>
        </md-tab>

        <!-- TODO The modal resizes when I change tabs, can I avoid that? -->
        <md-tab md-label="Node Editor" md-disabled>
          <!-- TODO This should be a component -->
          <!-- <div class="color-picker-button" :style="{'background-color': nodeEditorSettings.defaultVectorColor}" md-menu-trigger> -->
          <!--   <md-menu-content class="color-picker-popup"> -->
          <!--     <color-picker v-model="nodeEditorSettings.defaultVectorColor" disableAlpha /> -->
          <!--   </md-menu-content> -->
          <!-- </div> -->
          <!-- Default vector color -->
        </md-tab>

      </md-tabs>
    </form>

    <router-view />

  </div>
</div>
</template>

<script>
import { EventBus } from './EventBus';

export default {
    name: 'SettingsModal',
    data() {
        return {
            viewportSettings: JSON.parse(window.localStorage.getItem('viewport_settings')) || {
                showAxis: true,
                showGrid: true,
            },
            nodeEditorSettings: JSON.parse(window.localStorage.getItem('node_editor_settings')) || {
                defaultVectorColor: '#FFFF00',
            },
        };
    },
    methods: {
        save(event) {
            window.localStorage.setItem('viewport_settings', JSON.stringify(this.viewportSettings));
            window.localStorage.setItem('node_editor_settings', JSON.stringify(this.nodeEditorSettings));
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
    z-index: 10; /* md-button uses z-index 5 */
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
.color-picker-button {
    grid-column: controls;
    width: 1.4em;
    height: 1.4em;
    /* background-color: yellow; */
    border: 1px solid rgba(128, 128, 128, 0.4);
    margin: 0.5em;
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
