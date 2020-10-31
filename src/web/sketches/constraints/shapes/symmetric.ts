import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Segment from "@/web/sketches/shapes/segment";
import EndPoint from "@/web/sketches/shapes/point";


export default class SymmetricObject extends ConstraintObject {

    constructor(constraint: Constraint, parent: Array<SketchObject>) {
        super(constraint, parent);

        this.__class = "CSHAPE.Symmetric";
    }

    label(index: number) {
        return this._getRefsPoint(this.parent[index] as EndPoint);
    }

    private _getRefsPoint(endPoint: EndPoint) {
        let [direction, normal, refPt] = this._getDirectionsOfSegment(this.parent[2] as Segment);
        const ref = endPoint.toVector();
        const checkDir = refPt.minus(ref);
        if (checkDir.dot(normal) < 0) {
            normal._negate();
        }
        return [ref, ref.plus(normal.multiply(15)), direction];
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
        const [lref, lext, ln] = this.label(0);
        this.drawLine(ctx, lref, [lext]);
        this.drawArrow(ctx, lext.x, lext.y, -ln.x, -ln.y);

        const [rref, rext, rn] = this.label(1);
        this.drawLine(ctx, rref, [rext]);
        this.drawArrow(ctx, rext.x, rext.y, rn.x, rn.y);

        this.params = [lref, lext, rref, rext];
    }

}
