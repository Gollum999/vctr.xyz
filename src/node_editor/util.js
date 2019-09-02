import { Action } from 'rete-history-plugin';

export class FieldChangeAction extends Action {
    constructor(oldValue, newValue, setter) {
        super();
        console.log('FieldChangeAction constructor, old: ', oldValue, 'new:', newValue);
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.setter = setter;
    }
    undo() {
        console.log('FieldChangeAction undo()', this.oldValue);
        this.setter(this.oldValue);
    }
    redo() {
        console.log('FieldChangeAction redo()', this.newValue);
        this.setter(this.newValue);
    }
}

export default {
    /**
     * Stolen and slightly modified from https://gist.github.com/mjackson/5311256
     * Converts an HSL color value to RGB. Conversion formula adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and returns r, g, and b in the set [0, 255].
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  l       The lightness
     * @return  Array           The RGB representation
     */
    hslToRgb(h, s, l) {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return { r: r * 255, g: g * 255, b: b * 255 };
    },

    // Stolen and slightly modified from https://stackoverflow.com/a/5624139/3282436
    rgbToHex(r, g, b) {
        // The (1 << 24) and the slice are a ghetto way to zero-pad the result
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(-6);
    },

    randomInRange(min, max) { // [min, max)
        return (Math.random() * (max - min)) + min;
    },

    getRandomColor() {
        const h = Math.random();
        const s = this.randomInRange(0.3, 1.0);
        const l = this.randomInRange(0.2, 0.8);
        return this.hslToRgb(h, s, l);
    },

    getEditorNode(editor, node) {
        return editor.nodes.find(n => n.id === node.id);
    },

    getInputValue(name, inputs, data) {
        // Assumes only a single connection per input, which is currently enforced by the editor
        return inputs[name].length ? inputs[name][0] : data[name];
    },

    // Is x a subset of y?
    isSubset(x, y) {
        return Array.from(x).every(val => y.has(val));
    },

    // Do x and y intersect?
    intersects(x, y) {
        return Array.from(x).some(val => y.has(val));
    },

    // What are the common elements between x and y?
    intersection(x, y) {
        return new Set([...x].filter(val => y.has(val)));
    },
};
