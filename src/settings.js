const MATRIX_COLOR_STYLE = Object.freeze({
    SOLID: 'solid',
    LENGTH: 'length',
});

export default {
    MATRIX_COLOR_STYLE,

    defaultSettings: {
        viewportSettings: {
            showAxis: true,
            showGrid: true,
            scalar: {
            },
            vector: {
            },
            matrix: {
                colorStyle: MATRIX_COLOR_STYLE.SOLID,
                vectorScale: 0.2,
                fieldSize: 8,
                fieldDensity: 0.5,
                showVectorHeads: true, // TODO adjustable size?
            },
        },
        nodeEditorSettings: {
            useRandomColors: false,
            // TODO Can I somehow use the class that vue-color uses?
            defaultScalarColor: '#7676dd',
            defaultVectorColor: '#ff4444',
            defaultMatrixColor: '#44ffff',
            showAdvancedRenderSettings: false,
        },
    },

    loadSettings(key = undefined) {
        if (key === undefined) {
            return {
                viewportSettings:   this.loadSettings('viewportSettings'),
                nodeEditorSettings: this.loadSettings('nodeEditorSettings'),
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
