import _ from 'lodash';

export enum ScalarRenderStyle {
    CIRCLE = 'Circle',
    SPHERE = 'Sphere',
}

export enum MatrixColorStyle {
    SOLID = 'solid',
    LENGTH = 'length',
};

const defaultViewportSettings = {
    showAxis: true,
    showGrid: true,
    scalar: {
        renderStyle: ScalarRenderStyle.CIRCLE,
    },
    vector: {
        headSize: 0.5,
    },
    matrix: {
        colorStyle: MatrixColorStyle.SOLID,
        vectorScale: 0.2,
        fieldSize: 8,
        fieldDensity: 0.5,
        headSize: 0.2,
    },
};

const defaultNodeEditorSettings = {
    useRandomColors: false,
    // TODO Can I somehow use the class that vue-color uses?
    defaultScalarColor: '#7777dd',
    defaultVectorColor: '#ff4444',
    defaultMatrixColor: '#22ee55',
    defaultScalarVisibility: false,
    defaultVectorVisibility: true,
    defaultMatrixVisibility: false,
    showAdvancedRenderSettings: false,
};

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
        const settingsJson = window.localStorage.getItem(this.key);
        if (settingsJson) {
            this.values = _.merge({}, this.defaultValues, JSON.parse(settingsJson));
        } else {
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
