import SketchShape from "@/web/sketches/shape";
import Vector from "@/web/math/vector";


export class ReferencePoint extends SketchShape {

    private readonly x: number;
    private readonly y: number;

    constructor(x: number, y: number) {
        super(-1);
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D, scale: number) {
        if (!this.visible) return;
        ctx.save();

        ctx.strokeStyle = 'salmon';
        ctx.fillStyle = 'salmon';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(this.x, this.y, 1 / scale, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, 7 / scale, 0, 2 * Math.PI, false);
        ctx.stroke();

        let rad = 20 / scale;
        ctx.moveTo(this.x - rad, this.y);
        ctx.lineTo(this.x + rad, this.y);
        ctx.closePath();
        ctx.moveTo(this.x, this.y - rad);
        ctx.lineTo(this.x, this.y + rad);
        ctx.closePath();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();

        ctx.restore();
    }

    traverse(visitor: Function) {
        visitor(this);
    }

    traverseReversely(visitor: Function) {
        visitor(this);
    }
}


export class ReferenceLine extends SketchShape {

    private readonly start: Vector;
    private readonly end: Vector;

    constructor(start: Vector, end: Vector) {
        super(-1);
        this.start = start;
        this.end = end;
    }

    draw(ctx: CanvasRenderingContext2D, scale: number) {
        if (!this.visible) return;
        ctx.save();

        ctx.strokeStyle = 'salmon';
        ctx.fillStyle = 'salmon';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.setLineDash([5 / scale]);
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        ctx.restore();
    }

    traverse(visitor: Function) {
        visitor(this);
    }

    traverseReversely(visitor: Function) {
        visitor(this);
    }
}
