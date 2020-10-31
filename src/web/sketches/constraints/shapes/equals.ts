import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject, {CIRCLE} from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Vector from "@/web/math/vector";
import Segment from "@/web/sketches/shapes/segment";
import Circle from "@/web/sketches/shapes/circle";


export default class EqualsObject extends ConstraintObject {

    constructor(constraint: Constraint, parent: Array<SketchObject>) {
        super(constraint, parent);

        this.__class = "CSHAPE.Equals";
    }

    label(index: number) {
        return this._getEqualLines(this.parent[index]);
    }

    private _getEqualLines(shape: SketchObject) {
        if (shape.class === CIRCLE) {
            const circle = shape as Circle;
            const direction = new Vector(1, 1, 0)._normalize();
            const middlePt = circle.c.toVector().plus(direction.multiply(circle.r));
            return [middlePt.plus(direction.multiply(-10)), middlePt.plus(direction.multiply(10))];
        } else {
            const segment = shape as Segment;
            const [_, normal, middlePt] = this._getDirectionsOfSegment(segment, Math.PI / 4);
            return [middlePt.plus(normal.multiply(10)), middlePt.plus(normal.multiply(-10))];
        }
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
        this.params = [];
        for (let i = 0; i < this.parent.length; ++i) {
            const [ha, hb] = this.label(i);
            this.params.push(ha, hb);
            this.drawLine(ctx, ha, [hb]);
        }
    }

}
