import * as settings from '../settings';
import * as util from '../util';
import allComponents from './components';
import UnaryOperation from './UnaryOperation';
import BinaryOperation from './BinaryOperation';
import { ValueNodeType, UnaryOperationNodeType, BinaryOperationNodeType } from './node_util';

export default class NodeFactory {
    constructor() {
        console.log(ValueNodeType, UnaryOperationNodeType, BinaryOperationNodeType);
        this.components = Object.freeze({
            ...Object.fromEntries(Object.values(ValueNodeType).map(nodeType => [nodeType, new allComponents.ValueComponent(nodeType)])),
            ...Object.fromEntries(Object.values(UnaryOperationNodeType).map(nodeType => [nodeType, new allComponents.UnaryOperationComponent(UnaryOperation[nodeType])])),
            ...Object.fromEntries(Object.values(BinaryOperationNodeType).map(nodeType => [nodeType, new allComponents.BinaryOperationComponent(BinaryOperation[nodeType])])),
        });
        console.log('NodeFactory', this.components);
        this.settings = settings.nodeEditorSettings;
    }

    getRandomColorHex() {
        return util.rgbToHex(...Object.values(util.getRandomColor()));
    }

    getNewNodeColor(nodeType) {
        const defaultColor = {
            [ValueNodeType.SCALAR]: this.settings.values.defaultScalarColor,
            [ValueNodeType.VECTOR]: this.settings.values.defaultVectorColor,
            [ValueNodeType.MATRIX]: this.settings.values.defaultMatrixColor,
        }[nodeType];
        if (defaultColor == null) {
            throw new Error(`Unsupported nodeType ${nodeType}`);
        }

        return this.settings.values.useRandomColors ? this.getRandomColorHex() : defaultColor;
    }

    async createNode(nodeType, initialData = null) {
        const data = (() => {
            if (initialData !== null) {
                return initialData;
            }
            switch (nodeType) {
            case ValueNodeType.SCALAR: return {
                'color': { color: this.getNewNodeColor(ValueNodeType.SCALAR), visible: false },
                'value': [1],
                'pos': [0, 0, 0],
            };
            case ValueNodeType.VECTOR: return {
                'color': { color: this.getNewNodeColor(ValueNodeType.VECTOR), visible: true },
                'value': [1, 1, 1],
                'pos': [0, 0, 0],
            };
            case ValueNodeType.MATRIX: return {
                'color': { color: this.getNewNodeColor(ValueNodeType.MATRIX), visible: false },
                'value': [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ],
                'pos': [0, 0, 0],
            };
            }
            return undefined;
        })();
        console.log('creating with data', data);

        if (!Object.keys(this.components).includes(nodeType)) {
            throw new Error(`Cannot add node of invalid type ${nodeType}`);
        }
        // return this.components[nodeType].createNode(data);
        const result = this.components[nodeType].createNode(data);
        console.log('RESULT', result);
        return result;
    };
}
