export interface SimpleRect {
    top: number,
    left: number,
    right: number,
    bottom: number,
};

export default class Rect {
    public top: number;
    public left: number;
    public right: number;
    public bottom: number;

    constructor({top, left, right, bottom}: SimpleRect) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
    }

    width(): number {
        return this.right - this.left;
    }

    height(): number {
        return this.bottom - this.top;
    }

    midpoint(): [number, number] {
        return [this.left + (this.width() / 2), this.top + (this.height() / 2)];
    }

    grow(padding: number): void {
        this.top -= padding;
        this.bottom += padding;
        this.left -= padding;
        this.right += padding;
    }

    union(other: Rect): Rect {
        return new Rect({
            top: Math.min(this.top, other.top),
            left: Math.min(this.left, other.left),
            right: Math.max(this.right, other.right),
            bottom: Math.max(this.bottom, other.bottom),
        });
    }
}
