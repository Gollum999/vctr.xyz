import _ from 'lodash';

export enum MATRIX_COLOR_STYLE {
    SOLID = 'solid',
    LENGTH = 'length',
};

const defaultViewportSettings = {
    showAxis: true,
    showGrid: true,
    scalar: {
    },
    vector: {
        headSize: 0.5,
    },
    matrix: {
        colorStyle: MATRIX_COLOR_STYLE.SOLID,
        vectorScale: 0.2,
        fieldSize: 8,
        fieldDensity: 0.5,
        // showVectorHeads: true, // TODO adjustable size?
    },
};

const defaultNodeEditorSettings = {
    useRandomColors: false,
    // TODO Can I somehow use the class that vue-color uses?
    defaultScalarColor: '#7676dd',
    defaultVectorColor: '#ff4444',
    defaultMatrixColor: '#44ffff',
    showAdvancedRenderSettings: false,
};

// export type Settings = typeof defaultSettings;
export type SettingsKey = 'viewport_settings' | 'node_editor_settings';
export type ViewportSettings = typeof defaultViewportSettings;
export type NodeEditorSettings = typeof defaultNodeEditorSettings;

export class SettingsStore<SettingsValues extends ViewportSettings | NodeEditorSettings> {
    private readonly key: SettingsKey;
    private readonly defaultValues: SettingsValues;
    // TODO make this private and provide getter?
    public values: SettingsValues;

    constructor(key: SettingsKey, defaultValues: SettingsValues) {
        this.key = key;
        this.defaultValues = defaultValues;
        this.values = defaultValues;
    }

    load() {
        console.log(`Loading ${this.key}`);
        const settingsJson = window.localStorage.getItem(this.key);
        if (settingsJson) {
            this.values = _.merge({}, this.defaultValues, JSON.parse(settingsJson));
            console.log(`Successfully loaded ${this.key}`, this.values);
        } else {
            console.log(`Using default ${this.key}`);
            this.values = this.defaultValues;
        }
    }

    save() {
        if (this.values !== null) {
            window.localStorage.setItem(this.key, JSON.stringify(this.values));
        }
    }

    update(key: string, value: any) {
        const fullKey = `values.${key}`;
        console.log(`Updating setting ${this.key}.${fullKey} to ${value}`);
        if (!_.has(this, fullKey)) {
            throw new Error(`Invalid key: ${fullKey}`);
        }
        _.set(this, fullKey, value);
        this.save();
    }
};

export const nodeEditorSettings: SettingsStore<NodeEditorSettings> = new SettingsStore('node_editor_settings', defaultNodeEditorSettings);
nodeEditorSettings.load();
export const viewportSettings: SettingsStore<ViewportSettings> = new SettingsStore('viewport_settings', defaultViewportSettings);
viewportSettings.load();
