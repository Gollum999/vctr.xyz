export default {
    defaultSettings: {
        viewportSettings: {
            showAxis: true,
            showGrid: true,
        },
        nodeEditorSettings: {
            // TODO Can I somehow use the class that vue-color uses?
            defaultScalarColor: { hex: '#7676dd', rgba: { r: 118, g: 118, b: 221 } },
            defaultVectorColor: { hex: '#ff4444', rgba: { r: 255, g:  68, b:  68 } },
        },
    },

    loadSettings(key = undefined) {
        if (key === undefined) {
            return {
                'viewportSettings':    this.loadSettings('viewportSettings'),
                'nodeEditorSettings': this.loadSettings('nodeEditorSettings'),
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
        window.localStorage.setItem('viewportSettings', JSON.stringify(viewportSettings));
        window.localStorage.setItem('nodeEditorSettings', JSON.stringify(nodeEditorSettings));
    },
};
