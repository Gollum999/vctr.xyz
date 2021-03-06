import * as settings from '../settings';
import * as util from '../util';
import * as allComponents from './components';
import { ValueNodeType, UnaryOperationNodeType, BinaryOperationNodeType, ADVANCED_RENDER_CONTROLS_KEY } from './node_util';
import { Component } from 'rete/types/component';
import { Node } from 'rete/types/node';

export default class NodeFactory {
    public readonly components: { [key: string]: Component };
    private readonly settings: settings.SettingsStore<settings.NodeEditorSettings>;

    constructor() {
        this.components = Object.freeze({
            ...Object.fromEntries(Object.values(ValueNodeType).map(nodeType => [nodeType, new allComponents.ValueComponent(nodeType)])),
            ...Object.fromEntries(Object.values(UnaryOperationNodeType).map(nodeType => [nodeType, new allComponents.UnaryOperationComponent(nodeType)])),
            ...Object.fromEntries(Object.values(BinaryOperationNodeType).map(nodeType => [nodeType, new allComponents.BinaryOperationComponent(nodeType)])),
        });
        this.settings = settings.nodeEditorSettings;
    }

    getRandomColorHex(): string {
        return util.rgbToHex(util.getRandomColor());
    }

    getNewNodeColor(nodeType: string): string {
        const defaultColor = ({
            [ValueNodeType.SCALAR]: this.settings.values.defaultScalarColor,
            [ValueNodeType.VECTOR]: this.settings.values.defaultVectorColor,
            [ValueNodeType.MATRIX]: this.settings.values.defaultMatrixColor,
        } as {[key: string]: string})[nodeType];
        if (defaultColor == null) {
            throw new Error(`Unsupported nodeType ${nodeType}`);
        }

        return this.settings.values.useRandomColors ? this.getRandomColorHex() : defaultColor;
    }

    async createNode(nodeType: string, initialData: any | null = null): Promise<Node> {
        const data = (() => {
            if (initialData !== null) {
                return initialData;
            }
            switch (nodeType) {
            case ValueNodeType.SCALAR: return {
                'color': { color: this.getNewNodeColor(ValueNodeType.SCALAR), visible: this.settings.values.defaultScalarVisibility },
                'value': [1],
                [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
            };
            case ValueNodeType.VECTOR: return {
                'color': { color: this.getNewNodeColor(ValueNodeType.VECTOR), visible: this.settings.values.defaultVectorVisibility  },
                'value': [1, 1, 1],
                [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
            };
            case ValueNodeType.MATRIX: return {
                'color': { color: this.getNewNodeColor(ValueNodeType.MATRIX), visible: this.settings.values.defaultMatrixVisibility  },
                'value': [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ],
                [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
            };
            }
            return undefined;
        })();

        if (!Object.keys(this.components).includes(nodeType)) {
            throw new Error(`Cannot add node of invalid type ${nodeType}`);
        }
        return this.components[nodeType].createNode(data);
    };
}
