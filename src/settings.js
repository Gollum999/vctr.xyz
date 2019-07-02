export default {
    defaultSettings: {
        'viewport_settings': {
            showAxis: true,
            showGrid: true,
        },
        'node_editor_settings': {
            defaultScalarColor: { hex: '#7676dd' },
            defaultVectorColor: { hex: '#ff4444' },
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
