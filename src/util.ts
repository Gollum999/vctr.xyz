import _ from 'lodash';

export function clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
}

export type Color = { r: number, g: number, b: number };
export type ColorWithAlpha = Color & { a: number };

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
export function hslToRgb(h: number, s: number, l: number): Color {
    function hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q: number = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p: number = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r: r * 255, g: g * 255, b: b * 255 };
}

// Stolen and slightly modified from https://stackoverflow.com/a/5624139/3282436
export function rgbToHex({r, g, b}: Color): string {
    // The (1 << 24) and the slice are a ghetto way to zero-pad the result
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(-6);
}

// Stolen and slightly modified from https://stackoverflow.com/a/5624139/3282436
export function hexToRgb(hex: string): Color | null {
    const result: RegExpExecArray | null = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
}

export function getRandomColor(): Color {
    const h: number = Math.random();
    const s: number = _.random(0.4, 1.0);
    const l: number = _.random(0.3, 0.7);
    return hslToRgb(h, s, l);
}

export function capitalize(str: string): string {
    if (!str) {
        return '';
    }
    str = str.toString().toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str: string): string {
    if (!str) {
        return '';
    }
    const words: Array<string> = str.toString().toLowerCase().split(/\s+/);
    return words.map(capitalize).join(' ');
}

// Is x a subset of y?
export function isSubset<T>(x: Set<T>, y: Set<T>): boolean {
    return Array.from(x).every(val => y.has(val));
}

// Do x and y intersect?
export function intersects<T>(x: Set<T>, y: Set<T>): boolean {
    return Array.from(x).some(val => y.has(val));
}

// What are the common elements between x and y?
export function intersection<T>(x: Set<T>, y: Set<T>): Set<T> {
    return new Set([...x].filter(val => y.has(val)));
}

export function union<T>(first: Iterable<T>, ...rest: Array<Iterable<T>>): Set<T> {
    let _union = new Set(first);
    for (const otherSet of rest) {
        for (const elem of otherSet) {
            _union.add(elem);
        }
    }
    return _union;
}

export function xor<T>(setA: Iterable<T>, setB: Iterable<T>): Set<T> {
    let _difference = new Set(setA);
    for (let elem of setB) {
        if (_difference.has(elem)) {
            _difference.delete(elem);
        } else {
            _difference.add(elem);
        }
    }
    return _difference;
}

export function difference<T>(setA: Iterable<T>, setB: Iterable<T>): Set<T> {
    let _difference = new Set(setA);
    for (let elem of setB) {
        _difference.delete(elem);
    }
    return _difference;
}

// Stolen from https://github.com/lodash/lodash/issues/2240#issuecomment-418820848
export function flattenKeys(obj: any, path: Array<string> = []): {[path: string]: any} {
    return !_.isObject(obj)
        ? { [path.join('.')]: obj }
        : _.reduce(obj, (cum, next, key) => _.merge(cum, flattenKeys(next, [...path, key])), {});
}
