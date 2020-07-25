<template>
<div class="vec-viz">
  <div class="top-settings-container">
    <v-switch
        color="primary"
        :input-value="nodeEditorSettings.values.showAdvancedRenderSettings"
        @change="onShowAdvancedControlsChanged"
        label="Show advanced controls"
        hide-details
    />

    <v-dialog v-model="showSettingsDialog" class="settings-dialog-container" width="600">
        <template v-slot:activator="{ on: showDialog }">
        <v-btn class="settings-button" v-on="showDialog">
            <v-icon>settings</v-icon>
            Settings
        </v-btn>
        </template>

        <SettingsModal ref="settings-modal" @settings-modal-closed="showSettingsDialog = false"/>
    </v-dialog>
  </div>

  <Split direction="vertical" :gutterSize="4" @onDrag="onDrag">
    <SplitArea :size="50" :minSize="150">
      <QuadViewport />
    </SplitArea>
    <SplitArea class="bottom-split" :size="50" :minSize="150">
      <NodeEditor />
    </SplitArea>
  </Split>
</div>
</template>

<script>
import QuadViewport from './visualizer/QuadViewport';
import NodeEditor from './node_editor/NodeEditor';
import SettingsModal from './SettingsModal';
import * as settings from './settings';
import { EventBus } from './EventBus';

export default {
    name: 'VecViz',
    data() {
        return {
            nodeEditorSettings: settings.nodeEditorSettings,
            showSettingsDialog: false,
        };
    },
    components: {
        QuadViewport,
        NodeEditor,
        SettingsModal,
    },
    methods: {
        onShowAdvancedControlsChanged(val) {
            EventBus.$emit('show-advanced-controls-toggled', val);
        },
        onDrag(size) {
            EventBus.$emit('split-resized', size);
        },
    },
};
</script>

<style scoped>
.split {
    border: 1px solid #616161;
    border-bottom: 2px solid #616161; /* HACK: put a bottom border despite NodeEditor's hidden overflow */
}
.bottom-split {
    overflow-y: hidden;
}
.vec-viz {
    position: relative;
    margin-left: auto;
    margin-right: auto;
}
.top-settings-container {
    /* TODO probably a better way to position this but I am a CSS noob */
    position: absolute;
    width: 100%;
    top: -6px;
    left: 0px;
    transform: translateY(-100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.top-settings-container .v-input {
    margin-top: 0px;
    margin-right: 0px;
    padding-top: 0px;
}
.settings-button:hover {
    text-decoration: none;
}

@media screen and (max-height: 920px) {
    .vec-viz { height: 800px; }
}
@media screen and (min-height: 921px) {
    .vec-viz { height: calc(100vh - 120px); } /* 60px on top + bottom */
}

@media screen and (max-width: 720px) {
    .vec-viz { width: 600px; }
}
@media screen and (min-width: 721px) and (max-width: 1720px) {
    .vec-viz { width: calc(100vw - 120px); } /* 60px on left + right */
}
@media screen and (min-width: 1721px) {
    .vec-viz { width: 1600px; }
}
</style>

<style>
#app .gutter {
    background-color: #616161;
}
</style>
