import SketchObject from "@/web/sketches/shapes/object";
import {BrushPoint} from "@/web/sketches/shapes/point";
import Vector from "@/web/math/vector";

/**
 * Segment, constructed by two endPoints
 */
export default class Brushes extends SketchObject {

    constructor() {
        super();

        this.__class = "SKETCH.Brushes";
    }

    visitParams(callback: Function) {
    }

    translateImpl(dx: number, dy: number) {
        this.children.forEach((child: SketchObject) => {
            child.translateImpl(dx, dy);
        })
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
        if (this.children.length < 2) return;

        const startPoint = this.referencePoint() as BrushPoint;

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 1; i < this.children.length; ++i) {
            const curPoint = this.children[i] as BrushPoint;
            ctx.lineTo(curPoint.x, curPoint.y);
        }
        ctx.stroke();
    }

    copy() {
        const brush = new Brushes();
        this.children.forEach((child) => {
            brush.children.push(child.copy())
        });
        return brush;
    }

    referencePoint() {
        return this.children.length > 0 ? this.children[0] as BrushPoint: null;
    }

    normalDistance(aim: Vector, scale: number): number {
        return Brushes.leastDistanceFromPoint2Points(aim, this.children as Array<BrushPoint>);
    }

    static leastDistanceFromPoint2Points(pt: Vector, pts: Array<BrushPoint>) {
        let minor = 1e6;
        for (let point of pts) {
            const dis = pt.distanceTo(point.toVector());
            if (dis < minor) {
                minor = dis;
            }
        }

        return minor;
    }

}
