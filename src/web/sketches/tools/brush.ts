import BaseTool from "@/web/sketches/tools/tool";
import EndPoint, {BrushPoint} from "@/web/sketches/shapes/point";
import Sketcher from "@/web/sketches/sketcher";
import {SM_alloc} from "@/web/managers/om";
import Brushes from "@/web/sketches/shapes/brush";
import fit_line from "@/web/sketches/fits/linefit";
import Segment from "@/web/sketches/shapes/segment";
import Circle from "@/web/sketches/shapes/circle";
import fit_circle from "@/web/sketches/fits/circlefit";
import Arc from "@/web/sketches/shapes/arc";

const math = require('mathjs');


export default class BrushTool extends BaseTool {

    private isMouseDown: boolean;
    private brushes: Brushes | null;

    constructor(viewer: Sketcher) {
        super(viewer, 'brushes');

        this.isMouseDown = false;
        this.brushes = null;
    }

    restart() {
        this.brushes = null;
        this.sendHint('Sketch: begin stroke.')
    }

    cleanup() {
        this.viewer.cleanSnap();
    }

    mousedown(e: MouseEvent) {
        super.mousedown(e);

        this.isMouseDown = true;

        // init a new brush
        this.brushes = new Brushes();
        this.addObjectsByCommand([this.brushes!]);

        const pt = this.viewer.screenToModel(e);
        this.addBrushPoint(pt.x, pt.y);
    }

    mousemove(e: MouseEvent) {
        if (!this.isMouseDown) return;

        const curPt = this.viewer.screenToModel(e);
        if (curPt.distanceTo(this.lastPoint.toVector()) < 5) return;

        this.addBrushPoint(curPt.x, curPt.y);
    }

    mouseup(e: MouseEvent) {
        this.isMouseDown = false;

        const ans = fit_brush_points(this.brushes!.children as Array<BrushPoint>);
        if (ans.valid) {
            this.addObjectsByCommand([ans.obj!]);
            this.removeSketchObjects([this.brushes!]);
        }

        this.restart();
    }

    addBrushPoint(x: number, y: number) {
        const pt = new BrushPoint(x, y);
        this.addSketchObjects([pt]);
        this.brushes!.addChild(pt);
    }

    get lastPoint() {
        return this.brushes!.children[this.brushes!.children.length - 1] as BrushPoint;
    }

}

/**
 * fit the brush points as possible
 * @param pts
 */
function fit_brush_points(pts: Array<BrushPoint>) {
    let points = [];
    // 0. add filter to erase duplicate points
    for (let pt of pts) {
        points.push(pt.toVector());
    }
    // 1. fit the line firstly
    const line_ans = fit_line(points);
    if (line_ans.err.ave_error < 1) {
        const start_pt = new EndPoint(line_ans.a.x, line_ans.a.y);
        const end_pt = new EndPoint(line_ans.b.x, line_ans.b.y);
        return {
            valid: true,
            obj: new Segment(start_pt, end_pt)
        };
    }
    // 2. fit the circle secondly
    const circle_ans = fit_circle(points);
    if (circle_ans.err.ave_error < 30) {
        const center = new EndPoint(circle_ans.center.x, circle_ans.center.y);
        const radius = circle_ans.radius;
        if (circle_ans.full_angle) {
            return {
                valid: true,
                obj: new Circle(center, radius)
            };
        } else {
            const start = new EndPoint(radius * math.cos(circle_ans.start_angle) + center.x,
                radius * math.sin(circle_ans.start_angle) + center.y);
            const end = new EndPoint(radius * math.cos(circle_ans.end_angle) + center.x,
                radius * math.sin(circle_ans.end_angle) + center.y);
            return {
                valid: true,
                obj: new Arc(center, start, end, radius)
            }
        }
    }

    return {
        valid: false,
        obj: null
    }
}
