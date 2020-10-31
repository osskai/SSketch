import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Segment from "@/web/sketches/shapes/segment";


export default class PerpendicularObject extends ConstraintObject {

    constructor(constraint: Constraint, parent: Array<SketchObject>) {
        super(constraint, parent);

        this.__class = "CSHAPE.Perpendicular";
    }

    label(index: number) {
        let [direction, normal, middlePt] = this._getDirectionsOfSegment(this.parent[index] as Segment);
        normal._negate();
        const ua = middlePt.plus(normal.multiply(10)).plus(direction.multiply(10));
        const ub = ua.plus(direction.multiply(10));
        const uc = ua.plus(normal.multiply(10));

        return [ua, ub, uc];
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
        this.params = [];
        for (let i = 0; i < this.parent.length; ++i) {
            const [ua, ub, uc] = this.label(i);
            this.params.push(ua, ub, uc);
            this.drawLine(ctx, ub, [ua, uc]);
        }
    }

}
