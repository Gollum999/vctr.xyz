// TODO is there a library for this?
export default class Rect {
    constructor({top, left, right, bottom}) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
    }

    width() {
        return this.right - this.left;
    }

    height() {
        return this.bottom - this.top;
    }

    midpoint() {
        return [this.left + (this.width() / 2), this.top + (this.height() / 2)];
    }

    grow(padding) {
        this.top -= padding;
        this.bottom += padding;
        this.left -= padding;
        this.right += padding;
    }

    union(other) {
        return new Rect({
            top: Math.min(this.top, other.top),
            left: Math.min(this.left, other.left),
            right: Math.max(this.right, other.right),
            bottom: Math.max(this.bottom, other.bottom),
        });
    }
}
