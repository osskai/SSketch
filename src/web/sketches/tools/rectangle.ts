import BaseTool from "@/web/sketches/tools/tool";
import Segment from "@/web/sketches/shapes/segment";
import EndPoint from "@/web/sketches/shapes/point";
import Sketcher from "@/web/sketches/sketcher";
import {ConstraintDefinitions, HORIZONTAL, VERTICAL} from "@/web/sketches/constraints/schema";
import Constraint from "@/web/sketches/constraints/constraint";
import VerticalObject from "@/web/sketches/constraints/shapes/vertical";
import HorizontalObject from "@/web/sketches/constraints/shapes/horizontal";


/**
 * Rectangle Tool
 */
export default class RectangleTool extends BaseTool {

    private rectangle: Array<Segment> | null;
    private firstPointSnap: EndPoint | null;
    private readonly snapExclude: any[];
    private mouseP: { x: number, y: number };

    constructor(viewer: Sketcher) {
        super(viewer, 'rectangle');

        this.rectangle = null;
        this.firstPointSnap = null;
        this.snapExclude = [];
        this.mouseP = {x: 0, y: 0};
    }

    restart() {
        this.rectangle = null;
        this.sendHint('specify first point');
    }

    cleanup() {
        this.viewer.cleanSnap();
    }

    mousemove(e: MouseEvent) {
        const p = this.viewer.screenToModel(e);
        if (this.rectangle !== null) {
            this.mouseP = {x: p.x, y: p.y};
            this.alignSegments(p);
            this.viewer.snap(p.x, p.y, this.snapExclude);
        } else {
            this.viewer.snap(p.x, p.y, []);
        }
    }

    mouseup(e: MouseEvent) {
        const snapped = this.viewer.snapped !== null;

        let p;
        if (this.rectangle === null) {
            if (snapped) {
                this.firstPointSnap = <EndPoint>this.viewer.snapped;
                p = this.firstPointSnap;
                this.viewer.cleanSnap();
            } else {
                p = this.viewer.screenToModel(e);
            }
            this.createRectangle(p);
        } else {
            p = snapped ? this.viewer.snapped : this.viewer.screenToModel(e);
            this.alignSegments(p);
            if (snapped) {
                this.viewer.constraintManager.coincidePoints(<EndPoint>p, this.rectangle[2].a);
            }
            if (this.firstPointSnap !== null) {
                this.viewer.constraintManager.coincidePoints(this.firstPointSnap, this.rectangle[0].a);
            }

            this.viewer.cleanSnap();
            this.stepFinish(p);
        }
    }

    createRectangle(v: any) {
        const p = new EndPoint(v.x, v.y);
        //from top, clockwise
        this.rectangle = [
            new Segment(p, p.copy()),
            new Segment(p.copy(), p.copy()),
            new Segment(p.copy(), p.copy()),
            new Segment(p.copy(), p.copy())
        ];
        this.addObjectsByCommand(this.rectangle);
        for (let s of this.rectangle) {
            this.snapExclude.push(s.a, s.b);
        }
        this.pointPicked(p.x, p.y);
    }

    alignSegments(p: any) {
        this.rectangle![0].b.x = p.x;
        this.rectangle![1].a.x = p.x;
        this.rectangle![1].b.setFromPoint(p);
        this.rectangle![2].a.setFromPoint(p);
        this.rectangle![2].b.y = p.y;
        this.rectangle![3].a.y = p.y;

        this.viewer.refresh();
    }

    stepFinish(p: any) {
        this.pointPicked(p.x, p.y);
        const pm = this.viewer.constraintManager;
        pm.startTransaction();
        const rect = <Array<Segment>>this.rectangle;
        pm.coincidePoints(rect[0].a, rect[3].b);
        for (let i = 0; i < 3; ++i) {
            pm.coincidePoints(rect[i].b, rect[i + 1].a)
        }
        let constraints: Array<Constraint> = [];
        for (let i = 0; i < 4; ++i) {
            const hConstraint = ConstraintDefinitions.get((i % 2) ? VERTICAL : HORIZONTAL);
            if (hConstraint) {
                const constr = new Constraint(hConstraint, [rect[i]]);
                if (i % 2) {
                    constr.addShape(new VerticalObject(constr, constr.objects));
                } else {
                    constr.addShape(new HorizontalObject(constr, constr.objects));
                }
                constraints.push(constr);
            }
        }
        pm.addConstraints(constraints);
        pm.finishTransaction();
        this.viewer.toolManager.releaseControl();
    }

    keydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            // during the move process, and force to create rectangle
            this.stepFinish(this.mouseP);
        }
        super.keydown(e);
    }
}
