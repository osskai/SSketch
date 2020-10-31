import SketchObject, {CIRCLE, ENDPOINT} from "@/web/sketches/shapes/object";
import EndPoint from "@/web/sketches/shapes/point";
import {distanceAB, TOLERANCE} from "@/web/math/algebra";
import {SM_alloc} from "@/web/managers/om";
import Vector from "@/web/math/vector";
import {pointToLineSignedDistance} from "@/web/sketches/shapes/utils";

/**
 * Segment, constructed by two endPoints
 */
export default class Segment extends SketchObject {

    public a: EndPoint;
    public b: EndPoint;

    private dimHelpPt: EndPoint | null;

    constructor(a: EndPoint, b: EndPoint) {
        super();

        this.a = a;
        this.b = b;
        this.addChild(a);
        this.addChild(b);

        this.dimHelpPt = null;

        this.__class = "SKETCH.Segment";
    }

    visitParams(callback: Function) {
        this.a.visitParams(callback);
        this.b.visitParams(callback);
    }

    recoverIfNecessary() {
        if (distanceAB(this.a.toVector(), this.b.toVector()) > TOLERANCE) {
            return false;
        } else {
            const recoverLength = 100;
            this.a.translate(-recoverLength, -recoverLength);
            this.b.translate(recoverLength, recoverLength);
            return true;
        }
    }

    translateImpl(dx: number, dy: number) {
        this.a.translate(dx, dy);
        this.b.translate(dx, dy);
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.beginPath();
        ctx.moveTo(this.a.x, this.a.y);
        ctx.lineTo(this.b.x, this.b.y);
        ctx.stroke();
    }

    copy() {
        return new Segment(this.a.copy(), this.b.copy());
    }

    tessellation() {
        return [this.a, this.b];
    }

    direction() {
        return new Vector(this.b.x - this.a.x, this.b.y - this.a.y)._normalize();
    }

    length() {
        return distanceAB(this.a.toVector(), this.b.toVector());
    }

    referencePoint(): EndPoint {
        return this.a;
    }

    normalDistance(aim: Vector, scale: number): number {
        return Segment.calcNormalDistance(aim, this.a, this.b);
    }

    static calcNormalDistance(aim: Vector, segmentA: EndPoint, segmentB: EndPoint) {
        const ab = new Vector(segmentB.x - segmentA.x, segmentB.y - segmentA.y);
        const e = ab.normalize();
        const a = new Vector(aim.x - segmentA.x, aim.y - segmentA.y);
        const b = e.multiply(a.dot(e));
        const n = a.minus(b);

        //Check if vector b lays on the vector ab
        if (b.length() > ab.length()) {
            return -1;
        }

        if (b.dot(ab) < 0) {
            return -1;
        }

        return n.length();
    }

    nearestPointToSegment(pt: EndPoint) {
        const lineDir = this.direction();
        const normal = lineDir.rotateZ(-Math.PI / 2);
        const dist = pointToLineSignedDistance(this.a.x, this.a.y, this.b.x, this.b.y, pt.x, pt.y);
        const point = normal._multiply(dist)._plus(pt.toVector());

        // TODO: how to deal this help point
        if (this.dimHelpPt !== null) {
            this.dimHelpPt.setFromPoint(point);
        } else {
            this.dimHelpPt = SM_alloc(new EndPoint(point.x, point.y));
            this.dimHelpPt!.parent = this;
        }
        return this.dimHelpPt;
    }

    shareNoCoincidentWith(item: SketchObject) {
        if (item.class === CIRCLE) return true;

        return item.accept((o: SketchObject) => {
            if (o.class === ENDPOINT) {
                const pt = o as EndPoint;
                if (this.a.toVector().distanceTo(pt.toVector()) < TOLERANCE) {
                    return false;
                }
                if (this.b.toVector().distanceTo(pt.toVector()) < TOLERANCE) {
                    return false;
                }
            }
            return true;
        });
    }
}

