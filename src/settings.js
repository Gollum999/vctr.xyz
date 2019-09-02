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
            // TODO Can I somehow use the class that vue-color uses?
            useRandomColors: false,
            defaultScalarColor: { hex: '#7676dd', rgba: { r: 118, g: 118, b: 221 } },
            defaultVectorColor: { hex: '#ff4444', rgba: { r: 255, g:  68, b:  68 } },
            defaultMatrixColor: { hex: '#44ffff', rgba: { r: 68,  g: 255, b: 255 } },
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
