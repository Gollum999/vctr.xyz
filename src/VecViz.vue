<template>
<div class="vec-viz-outer">
  <div class="top-settings-container">
    <v-switch
        color="primary"
        :input-value="nodeEditorSettings.values.showAdvancedRenderSettings"
        @change="onShowAdvancedControlsChanged"
        label="Show 'Position' controls"
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

  <div class="vec-viz">
    <Split direction="vertical" :gutterSize="4" @onDrag="onDrag">
      <SplitArea :size="50" :minSize="150">
        <QuadViewport />
      </SplitArea>
      <SplitArea class="bottom-split" :size="50" :minSize="150">
        <NodeEditor />
      </SplitArea>
    </Split>
  </div>
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
.vec-viz-outer {
    position: relative;
    padding: 18px 60px 60px;
    /* centering */
    margin-left: auto;
    margin-right: auto;
}
@media screen and (max-width: 720px) {
    .vec-viz-outer {
        padding: 18px 20px 60px;
    }
}
.top-settings-container {
    margin-bottom: 6px;
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

@media screen and (max-height: 720px) {
    .vec-viz { height: 600px; }
}
@media screen and (min-height: 721px) {
    .vec-viz { height: calc(100vh - 120px); } /* 60px on top + bottom */
}

@media screen and (max-width: 440px) {
    .vec-viz { width: 400px; }
}
@media screen and (min-width: 441px) and (max-width: 1720px) {
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
