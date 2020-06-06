function capitalize(str) {
    if (!str) {
        return '';
    }
    str = str.toString().toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export default {
    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    },

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

    // Stolen and slightly modified from https://stackoverflow.com/a/5624139/3282436
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    },

    randomInRange(min, max) { // [min, max)
        return (Math.random() * (max - min)) + min;
    },

    getRandomColor() {
        const h = Math.random();
        const s = this.randomInRange(0.4, 1.0);
        const l = this.randomInRange(0.3, 0.7);
        return this.hslToRgb(h, s, l);
    },

    capitalize,

    titleCase(str) {
        if (!str) {
            return '';
        }
        const words = str.toString().toLowerCase().split(/\s+/);
        return words.map(capitalize).join(' ');
    },

    // Is x a subset of y?
    isSubset(x, y) {
        return Array.from(x).every(val => y.has(val));
    },

    // Do x and y intersect?
    intersects(x, y) {
        return Array.from(x).some(val => y.has(val));
    },

    // TODO lodash already supports a lot of these
    // What are the common elements between x and y?
    intersection(x, y) {
        return new Set([...x].filter(val => y.has(val)));
    },

    union(setA, setB) {
        let _union = new Set(setA);
        for (let elem of setB) {
            _union.add(elem);
        }
        return _union;
    },

    xor(setA, setB) {
        let _difference = new Set(setA);
        for (let elem of setB) {
            if (_difference.has(elem)) {
                _difference.delete(elem);
            } else {
                _difference.add(elem);
            }
        }
        return _difference;
    },

    difference(setA, setB) {
        let _difference = new Set(setA);
        for (let elem of setB) {
            _difference.delete(elem);
        }
        return _difference;
    },
};
