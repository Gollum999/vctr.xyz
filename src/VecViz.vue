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

        <!-- TODO add confirm dialog when toggling this off, since doing so will remove some controls -->
        <SettingsModal ref="settings-modal" @settings-modal-closed="showSettingsDialog = false"/>
    </v-dialog>
  </div>

  <Split direction="vertical" :gutterSize="8" @onDragStart="onDragStart" @onDrag="onDrag" @onDragEnd="onDragEnd">
    <SplitArea :size="50" :minSize="150">
      <QuadViewport />
    </SplitArea>
    <SplitArea class="bottom-split" :size="50" :minSize="150">
      <NodeEditor @process="editorJson = $event"/>
    </SplitArea>
  </Split>
  <p style="color: #333333">{{editorJson}}</p>
</div>
</template>

<script>
import QuadViewport from './visualizer/QuadViewport';
import NodeEditor from './node_editor/NodeEditor';
import SettingsModal from './SettingsModal';
import settings from './settings';
import { EventBus } from './EventBus';

export default {
    name: 'VecViz',
    data() {
        return {
            editorJson: '',
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
            // console.log('CHANGE', this.nodeEditorSettings.values);
            EventBus.$emit('show-advanced-controls-toggled', val);
        },
        onDrag(size) {
            EventBus.$emit('split-resized', size);
        },
        onDragStart(size) {
            console.log(`split drag start ${size}`);
        },
        onDragEnd(size) {
            console.log(`split drag end ${size}`);
        },
    },
};
</script>

<style scoped>
.split {
    border: 1px solid #bbbbbb;
    border-bottom: 2px solid #bbbbbb; /* TODO this is a hack to put a bottom border despite NodeEditor's hidden overflow */
}
.bottom-split {
    overflow-y: hidden;
}
.vec-viz {
    position: relative;
    margin-left: auto; /* TODO why did I add this? */
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
.settings-dialog-container {
    /* TODO this is a hack because v-dialog adds some extra space in the style of the element? */
    display: none !important;
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
.v-dialog__container !important {
    /* TODO below is a hack because v-dialog adds some extra space? and it's adding it in the style of the element... */
    display: none;
}
</style>
