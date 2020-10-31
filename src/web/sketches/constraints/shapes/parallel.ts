import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Segment from "@/web/sketches/shapes/segment";


export default class ParallelObject extends ConstraintObject {

    constructor(constraint: Constraint, parent: Array<SketchObject>) {
        super(constraint, parent);

        this.__class = "CSHAPE.Parallel";
    }

    label(index: number) {
        return [...this._getOffsetLine(this.parent[index] as Segment, true),
            ...this._getOffsetLine(this.parent[index] as Segment, false)];
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
        this.params = [];
        for (let i = 0; i < this.parent.length; ++i) {
            const [la, lb, ra, rb] = this.label(i);

            this.params.push(la, lb);
            this.drawLine(ctx, la, [lb]);

            this.params.push(ra, rb);
            this.drawLine(ctx, ra, [rb]);
        }
    }

}
