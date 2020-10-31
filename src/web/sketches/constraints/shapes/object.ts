import SketchShape from "@/web/sketches/shape";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Vector from "@/web/math/vector";
import {Styles} from "@/web/sketches/styles";
import Segment from "@/web/sketches/shapes/segment";
import {syslog} from "@/web/syslog";


abstract class ConstraintObject extends SketchShape {

    constraint: Constraint;
    parent: Array<SketchObject>;

    protected constructor(constraint: Constraint, parent: Array<SketchObject>) {
        super();

        this.constraint = constraint;
        this.parent = parent;
    }

    traverse(visitor: Function) {
        visitor(this);
    }

    traverseReversely(visitor: Function) {
        visitor(this);
    }

    normalDistance(aim: Vector, scale: number) {
        let min = 50;
        try {
            for (const item of this.params) {
                const dis = item.distanceTo(aim);
                if (dis < min) {
                    min = dis;
                }
            }
        } catch (e) {
            syslog.error('params is not initialized', this.params);
        }

        return min;
    }

    draw(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher) {
        if (!this.visible) return;

        let style = this.getCustomerStyle();
        ctx.save();
        viewer.setStyle(style, ctx);

        this.drawImpl(ctx, scale, viewer);
        ctx.restore();
    }

    getCustomerStyle() {
        if (this.markers.length !== 0) {
            return this.markers[0];
        }
        return Styles.ANNOTATIONS;
    }

    abstract drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void;

    drawLine(ctx: CanvasRenderingContext2D, a: Vector, bs: Array<Vector>) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        bs.forEach((b) => {
            ctx.lineTo(b.x, b.y);
        });
        ctx.stroke();
    }

    drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, nx: number, ny: number,
              arrowW: number = 10, arrowH: number = 5) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - ny * arrowW - nx * arrowH, y + nx * arrowW - ny * arrowH);
        ctx.lineTo(x - ny * arrowW + nx * arrowH, y + nx * arrowW + ny * arrowH);
        ctx.fill();
    }

    protected _getOffsetLine(segment: Segment, left: boolean, offsetDis: number = 0) {
        let [direction, normal, middlePt] = this._getDirectionsOfSegment(segment);
        if (!left) {
            normal = direction.rotateZ(Math.PI / 2);
        }
        const offset = middlePt._plus(normal._multiply(5));
        return [offset.plus(direction.multiply(10 + offsetDis)),
            offset.plus(direction.multiply(-10 + offsetDis))];
    }

    protected _getDirectionsOfSegment(segment: Segment, angle: number = 0) {
        const direction = segment.direction();
        const middlePt = segment.a.toVector().plus(segment.b.toVector())._divide(2);
        let normal = direction.rotateZ(-Math.PI / 2 + angle);
        return [direction, normal, middlePt];
    }
}

export default ConstraintObject;
