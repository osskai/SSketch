import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Segment from "@/web/sketches/shapes/segment";


export default class VerticalObject extends ConstraintObject {

    constructor(constraint: Constraint, parent: Array<SketchObject>) {
        super(constraint, parent);

        this.__class = "CSHAPE.Vertical";
    }

    label(index: number) {
        return this._getOffsetLine(this.parent[index] as Segment, false, -15);
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
        this.params = [];
        for (let i = 0; i < this.parent.length; ++i) {
            const [la, lb] = this.label(i);
            this.params.push(la, lb);
            this.drawLine(ctx, la, [lb]);
        }
    }

}
