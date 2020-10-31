import SketchObject from "@/web/sketches/shapes/object";
import EndPoint from "@/web/sketches/shapes/point";
import Vector from "@/web/math/vector";
import { distance } from "@/web/math/vec";

const math = require('mathjs');


export default class Arc extends SketchObject {

    public a: EndPoint;
    public b: EndPoint;
    public c: EndPoint;

    private _r: number;

    constructor(c: EndPoint, start: EndPoint, end: EndPoint, radius = 0) {
        super();
        this.c = c;
        this.addChild(c);

        this.a = start;
        this.addChild(start);

        this.b = end;
        this.addChild(end);

        this._r = radius;

        this.__class = "SKETCH.Arc";
    }

    visitParams(callback: Function) {
        this.a.visitParams(callback);
        this.b.visitParams(callback);
        this.c.visitParams(callback);
    }

    referencePoint() {
        return this.c;
    }

    get r() {
        return distance([this.a.x, this.a.y], [this.c.x, this.c.y]);
    }

    get start_angle() {
        return math.atan2(this.a.y - this.c.y, this.a.x - this.c.x);
    }

    get end_angle() {
        return math.atan2(this.b.y - this.c.y, this.b.x - this.c.x);
    }

    translateImpl(dx: number, dy: number) {
        this.a.translate(dx, dy);
        this.b.translate(dx, dy);
        this.c.translate(dx, dy);
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.beginPath();
        if (this.r > 0) {
            ctx.arc(this.c.x, this.c.y, this.r, this.start_angle, this.end_angle);
        }
        let distanceB = distance([this.b.x, this.b.y], [this.c.x, this.c.y]);
        if (Math.abs(this.r - distanceB) * scale > 1) {
            let adj = this.r / distanceB;
            ctx.save();
            ctx.setLineDash([7 / scale]);
            ctx.lineTo(this.b.x, this.b.y);
            ctx.moveTo(this.b.x + (this.b.x - this.c.x) / adj, this.b.y + (this.b.y - this.c.y) / adj);
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.stroke();
        }
    }

    isPointInsideSector(x: number, y: number) {
        const ca = new Vector(this.a.x - this.c.x, this.a.y - this.c.y);
        const cb = new Vector(this.b.x - this.c.x, this.b.y - this.c.y);
        const ct = new Vector(x - this.c.x, y - this.c.y);

        ca._normalize();
        cb._normalize();
        ct._normalize();
        const cosAB = ca.dot(cb);
        const cosAT = ca.dot(ct);

        const isInside = cosAT >= cosAB;
        const abInverse = ca.cross(cb).z < 0;
        const atInverse = ca.cross(ct).z < 0;

        let result;
        if (abInverse) {
            result = !atInverse || !isInside;
        } else {
            result = !atInverse && isInside;
        }
        return result;
    }

    normalDistance(aim: Vector) {
        const isInsideSector = this.isPointInsideSector(aim.x, aim.y);
        if (isInsideSector) {
            return math.abs(distance([aim.x, aim.y], [this.c.x, this.c.y]) - this.r);
        } else {
            return math.min(
                distance([aim.x, aim.y], [this.a.x, this.a.y]),
                distance([aim.x, aim.y], [this.b.x, this.b.y])
            );
        }
    }

    copy() {
        return new Arc(this.c.copy(), this.a.copy(), this.b.copy(), this.r);
    }

    mirror(dest: any, mirroringFunc: Function) {
        this.a.mirror(dest.b, mirroringFunc);
        this.b.mirror(dest.a, mirroringFunc);
        this.c.mirror(dest.c, mirroringFunc);
    }
}
