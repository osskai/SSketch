import BaseTool from "@/web/sketches/tools/tool";
import Sketcher from "@/web/sketches/sketcher";
import EndPoint from "@/web/sketches/shapes/point";
import Vector from "@/web/math/vector";
import Spline from "@/web/sketches/shapes/spline";


export default class SplineTool extends BaseTool {

    private spline: Spline | null;
    private nextPoint: EndPoint | null;

    constructor(viewer: Sketcher) {
        super(viewer, 'spline');

        this.spline = null;
        this.nextPoint = null;
    }

    restart() {
        this.spline = null;
        this.nextPoint = null;
        this.sendHint('Sketch: specify the first point.')
    }

    cleanup() {
        this.viewer.cleanSnap();
    }

    mousemove(e: MouseEvent) {
        let p = this.viewer.screenToModel(e);
        if (this.spline !== null && this.nextPoint !== null) {
            this.nextPoint.setFromPoint(p);
            this.viewer.refresh();
        } else {
            this.viewer.snap(p.x, p.y, []);
        }
    }

    mouseup(e: MouseEvent) {
        super.mouseup(e);
        if (!this.isButtonValid) return;

        const snapped = this.viewer.snapped !== null;
        if (this.spline === null) {
            let a: EndPoint | Vector = this.viewer.screenToModel(e);
            if (snapped) {
                a = this.viewer.snapped as EndPoint;
                this.viewer.cleanSnap();
            }
            this.initSpline(a.x, a.y);
            this.firstPointPicked(a.x, a.y);
        } else {
            this.nextPointPicked(this.viewer.screenToModel(e));
        }
    }

    nextPointPicked(pt: Vector) {
        this.addToSpline(pt.x, pt.y);

        this.sendHint('Sketch: specify the next point.');
    }

    firstPointPicked(x: number, y: number) {
        this.pointPicked(x, y);
        this.sendHint('Sketch: specify the next point.');
    }

    private initSpline(x: number, y: number) {
        this.spline = new Spline(new EndPoint(x, y));
        this.addObjectsByCommand([this.spline]);

        this.nextPoint = new EndPoint(x, y);
        this.addSplineChild(this.nextPoint);
    }

    private addToSpline(x: number, y: number) {
        this.pointPicked(x, y);
        if (this.spline !== null) {
            this.spline.removeChild(this.nextPoint!);
            this.addSplineChild(this.nextPoint!.copy());
            this.spline.addChild(this.nextPoint!);
        }
    }

    private addSplineChild(pt: EndPoint) {
        this.addSketchObjects([pt]);
        this.spline!.addChild(pt);
    }
}
