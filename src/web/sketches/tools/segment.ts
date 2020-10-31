import BaseTool from "@/web/sketches/tools/tool";
import Segment from "@/web/sketches/shapes/segment";
import EndPoint from "@/web/sketches/shapes/point";
import Sketcher from "@/web/sketches/sketcher";
import Vector from "@/web/math/vector";
import SketchObject, {CIRCLE, ENDPOINT, SEGMENT} from "@/web/sketches/shapes/object";
import Circle from "@/web/sketches/shapes/circle";


export default class SegmentTool extends BaseTool {

    private line: Segment | null;
    private readonly multi: boolean;

    constructor(viewer: Sketcher, multi?: boolean) {
        super(viewer, "line");

        this.line = null;
        this.multi = multi || false;
    }

    restart() {
        this.line = null;
        this.sendHint('Sketch: specify the first point.')
    }

    cleanup() {
        this.viewer.cleanSnap();
    }

    alignmentEndPoint(e: MouseEvent, pt: EndPoint | Vector) {
        if (e.ctrlKey) {
            const deltaX = Math.abs(pt.x - this.line!.a.x);
            const deltaY = Math.abs(pt.y - this.line!.a.y);
            if (deltaX !== 0 && deltaY / deltaX < 0.1) {
                this.line!.b.x = pt.x;
                this.line!.b.y = this.line!.a.y;
            } else if (deltaY !== 0 && deltaX / deltaY < 0.1) {
                this.line!.b.x = this.line!.a.x;
                this.line!.b.y = pt.y;
            } else {
                this.line!.b.x = pt.x;
                this.line!.b.y = pt.y;
            }
        } else {
            this.line!.b.x = pt.x;
            this.line!.b.y = pt.y;
        }
        this.viewer.refresh();
    }

    mousemove(e: MouseEvent) {
        let p = this.viewer.screenToModel(e);
        if (this.line !== null) {
            this.viewer.snap(p.x, p.y, [this.line.a, this.line.b]);
            this.alignmentEndPoint(e, p);
        } else {
            this.viewer.snap(p.x, p.y, [], false);
        }
    }

    mouseup(e: MouseEvent) {
        if (!this.isButtonValid) return;

        const snap = this.viewer.snapped;
        if (this.line === null) {
            const b = this.viewer.screenToModel(e);
            if (snap !== null) {
                if (snap.class === ENDPOINT) {
                    const pt = snap as EndPoint;
                    this.line = this.addSegment(pt.x, pt.y, b.x, b.y);
                    this.viewer.constraintManager.coincidePoints(pt, this.line.a);
                } else if (snap.class === SEGMENT) {
                    this.line = this.addSegment(b.x, b.y, b.x, b.y);
                    this.viewer.constraintManager.pointOnLine(this.line.a, snap as Segment);
                } else if (snap.class === CIRCLE) {
                    this.line = this.addSegment(b.x, b.y, b.x, b.y);
                    this.viewer.constraintManager.pointOnCircle(this.line.a, snap as Circle);
                }
                this.viewer.cleanSnap();
            } else {
                this.line = this.addSegment(b.x, b.y, b.x, b.y);
            }
            this.firstPointPicked();
        } else {
            // clean the dash line
            if (snap !== null) {
                let p = this.viewer.snapped;
                this.viewer.cleanSnap();
                this.line.b.x = (p as EndPoint).x;
                this.line.b.y = (p as EndPoint).y;
                this.viewer.constraintManager.coincidePoints(<EndPoint>p, this.line.b);
                if (this.multi) {
                    // use a trick to finish the multi line
                    this.restart();
                    return;
                }
            }
            this.nextPointPicked();
        }
    }

    addSegment(x1: number, y1: number, x2: number, y2: number) {
        let line = new Segment(new EndPoint(x1, y1), new EndPoint(x2, y2));
        this.addObjectsByCommand([line]);

        return line;
    }

    nextPointPicked() {
        this.pointPicked(this.line!.b.x, this.line!.b.y);
        if (this.multi) {
            const b = this.line!.b;
            this.line = this.addSegment(b.x, b.y, b.x, b.y);
            this.viewer.constraintManager.coincidePoints(<EndPoint>b, this.line.a);
        } else {
            this.restart();
        }
        if (this.multi) {
            this.sendHint('Sketch: specify the next point.');
        }
    }

    firstPointPicked() {
        this.pointPicked(this.line!.a.x, this.line!.a.y);
        this.sendHint('Sketch: specify ' + (this.multi ? 'next' : 'end') + ' point.');
    }
}
