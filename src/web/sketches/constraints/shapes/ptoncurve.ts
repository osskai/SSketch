import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Vector from "@/web/math/vector";
import EndPoint from "@/web/sketches/shapes/point";


export default class PtOnCurveObject extends ConstraintObject {

    constructor(constraint: Constraint, parent: SketchObject) {
        super(constraint, [parent]);

        this.__class = "CSHAPE.PtOnCurve";
    }

    label(index: number) {
        return PtOnCurveObject._getRectangles(this.parent[index]);
    }

    private static _getRectangles(shape: SketchObject) {
        const endPoint = shape as EndPoint;
        const cx = endPoint.x;
        const cy = endPoint.y;
        return [new Vector(cx - 5, cy - 5), new Vector(cx + 5, cy - 5),
            new Vector(cx + 5, cy + 5), new Vector(cx - 5, cy + 5)];
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
        const [ra, rb, rc, rd] = this.label(0);
        this.params = [ra, rb, rc, rd];
        this.drawLine(ctx, ra, [rb, rc, rd, ra]);
    }

}
