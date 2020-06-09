import _ from 'lodash';

const MATRIX_COLOR_STYLE = Object.freeze({
    SOLID: 'solid',
    LENGTH: 'length',
});

const defaultSettings = {
    viewport_settings: {
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
            // showVectorHeads: true, // TODO adjustable size?
        },
    },
    node_editor_settings: {
        useRandomColors: false,
        // TODO Can I somehow use the class that vue-color uses?
        defaultScalarColor: '#7676dd',
        defaultVectorColor: '#ff4444',
        defaultMatrixColor: '#44ffff',
        showAdvancedRenderSettings: false,
    },
};

class SettingsStore {
    #key;
    // TODO make this private and provide getter?
    values;

    constructor(key) {
        this.key = key;
    }

    load() {
        console.log(`Loading ${this.key}`);
        const settingsJson = window.localStorage.getItem(this.key);
        if (settingsJson) {
            this.values = _.merge({}, defaultSettings[this.key], JSON.parse(settingsJson));
            console.log(`Successfully loaded ${this.key}`, this.values);
        } else {
            console.log(`Using default ${this.key}`);
            this.values = defaultSettings[this.key];
        }
    }

    save() {
        if (this.values !== undefined) {
            window.localStorage.setItem(this.key, JSON.stringify(this.values));
        }
    }

    update(key, value) {
        key = `values.${key}`;
        console.log(`Updating setting ${this.key}.${key} to ${value}`);
        if (!_.has(this, key)) {
            throw new Error(`Invalid key: ${key}`);
        }
        _.set(this, key, value);
        this.save();
    }
};

const nodeEditorSettings = new SettingsStore('node_editor_settings');
nodeEditorSettings.load();
const viewportSettings = new SettingsStore('viewport_settings');
viewportSettings.load();

export default {
    MATRIX_COLOR_STYLE,
    nodeEditorSettings,
    viewportSettings,
};
