export default {
    defaultSettings: {
        'viewport_settings': {
            showAxis: true,
            showGrid: true,
        },
        'node_editor_settings': {
            // TODO Can I somehow use the class that vue-color uses?
            defaultScalarColor: { hex: '#7676dd', rgba: { r: 118, g: 118, b: 221 } },
            defaultVectorColor: { hex: '#ff4444', rgba: { r: 255, g:  68, b:  68 } },
        },
    },

    loadSettings(key = undefined) {
        if (key === undefined) {
            return {
                'viewport_settings':    this.loadSettings('viewport_settings'),
                'node_editor_settings': this.loadSettings('node_editor_settings'),
            };
        } else {
            const settingsJson = window.localStorage.getItem(key);
            if (settingsJson) {
                return JSON.parse(settingsJson);
            } else {
                return this.defaultSettings[key];
            }
        }
    },

    saveSettings(viewportSettings, nodeEditorSettings) {
        window.localStorage.setItem('viewport_settings', JSON.stringify(viewportSettings));
        window.localStorage.setItem('node_editor_settings', JSON.stringify(nodeEditorSettings));
    },
};
