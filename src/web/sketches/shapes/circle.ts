import SketchObject from "@/web/sketches/shapes/object";
import EndPoint from "@/web/sketches/shapes/point";
import Vector from "@/web/math/vector";
import {distance} from "@/web/math/vec";
import Param from "@/web/sketches/expressions/params";

/**
 * Circle
 */
export default class Circle extends SketchObject {

    public c: EndPoint;

    constructor(c: EndPoint, radius: number = 0) {
        super();

        this.c = c;

        this.params = {
            r: new Param(radius, 'R'),
        };

        this.addChild(c);

        this.__class = "SKETCH.Circle";
    }

    get r() {
        return this.params.r.get();
    }

    set r(radius: number) {
        this.params.r.set(radius);
    }

    translateImpl(dx: number, dy: number) {
        this.c.translate(dx, dy);
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.beginPath();
        if (this.r > 0) {
            ctx.arc(this.c.x, this.c.y, this.r, 0, 2 * Math.PI);
        }
        ctx.stroke();
    }

    copy() {
        const circle = new Circle(this.c.copy());
        circle.r = this.r;
        return circle;
    }

    referencePoint(): EndPoint {
        return this.c;
    }

    normalDistance(aim: Vector, scale: number): number {
        return Math.abs(distance([aim.x, aim.y], [this.c.x, this.c.y]) - this.r);
    }

    visitParams(callback: Function): void {
        this.c.visitParams(callback);
        callback(this.params.r);
    }
}
