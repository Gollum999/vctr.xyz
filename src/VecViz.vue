<template>
<div :class="['vec-viz-outer', {small: $vuetify.breakpoint.smAndDown}]">
  <GithubCorner url="https://github.com/Gollum999/vctr.xyz" :size='$vuetify.breakpoint.smAndDown ? 20 : 60'
                cornerColor="#272727" gitColor="white" />
  <div class="top-settings-container">
    <v-switch
        :class="[{shrink: $vuetify.breakpoint.smAndDown}]"
        color="primary"
        :input-value="nodeEditorSettings.values.showAdvancedRenderSettings"
        @change="onShowAdvancedControlsChanged"
        label="Show 'Position' controls"
        hide-details
    />

    <v-dialog v-model="showSettingsDialog" class="settings-dialog-container" width="600">
        <template v-slot:activator="{ on: showDialog }">
        <v-btn class="settings-button" :x-small="$vuetify.breakpoint.smAndDown" v-on="showDialog">
            <v-icon :x-small="$vuetify.breakpoint.smAndDown">settings</v-icon>
            Settings
        </v-btn>
        </template>

        <SettingsModal ref="settings-modal" @settings-modal-closed="showSettingsDialog = false"/>
    </v-dialog>
  </div>

  <div :class="['vec-viz', {small: $vuetify.breakpoint.smAndDown}]">
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
import GithubCorner from 'vue-github-corners';
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
        GithubCorner,
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
.shrink {
    transform: scale(0.75);
    transform-origin: left;
}
.split {
    border: 1px solid #616161;
    border-bottom: 2px solid #616161; /* HACK: put a bottom border despite NodeEditor's hidden overflow */
}
.bottom-split {
    overflow-y: hidden;
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

.vec-viz-outer {
    position: relative;
    padding: 18px 60px 60px; /* 60px - 42px for header on top */
    /* centering */
    margin-left: auto;
    margin-right: auto;
}
.vec-viz-outer.small {
    padding: 6px 20px 20px;
}
@media screen and (max-height: 720px) {
    .vec-viz { height: 600px; }
}
@media screen and (min-height: 721px) {
    .vec-viz       { height: calc(100vh - 120px); } /* 60px on top + bottom */
    .vec-viz.small { height: calc(100vh - 56px); } /* 36px on top + 20px on bottom */
}

@media screen and (max-width: 400px) {
    .vec-viz { width: 360px; } /* stuff will start getting really janky if we go smaller than this */
}
@media screen and (min-width: 401px) and (max-width: 1720px) {
    .vec-viz       { width: calc(100vw - 120px); } /* 60px on left + right */
    .vec-viz.small { width: calc(100vw - 40px);  } /* 20px on left + right */
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
