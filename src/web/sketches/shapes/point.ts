import SketchObject, {SPLINE} from "@/web/sketches/shapes/object";
import Vector from "@/web/math/vector";
import Param from "@/web/sketches/expressions/params";


export default class EndPoint extends SketchObject {

    constructor(x: number, y: number, id: number = 0) {
        super(id);

        this.params = {
            x: new Param(x, 'X'),
            y: new Param(y, 'Y')
        };

        this.__class = 'SKETCH.EndPoint';
    }

    get x() {
        return this.params.x.get();
    }

    set x(val: number) {
        this.params.x.set(val);
    }

    get y() {
        return this.params.y.get();
    }

    set y(val: number) {
        this.params.y.set(val);
    }

    can_delete() {
        return !!(this.parent !== null && this.parent.class === SPLINE);
    }

    setFromPoint(p: any) {
        this.x = p.x;
        this.y = p.y;
    }

    updateParams(position: Vector) {
        this.x = position.x;
        this.y = position.y;
    }

    visitParams(callback: Function) {
        callback(this.params.x);
        callback(this.params.y);
    }

    normalDistance(aim: Vector) {
        return aim.minus(new Vector(this.x, this.y)).length();
    }

    translateImpl(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
        this.dims.forEach((dim) => {
            dim.synchronize(this, this.x, this.y);
        });
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3 / scale, 0, 2 * Math.PI, false);
        ctx.fill();
    }

    data() {
        return [this.x, this.y];
    }

    toVector() {
        return new Vector(this.x, this.y);
    }

    copy() {
        return new EndPoint(this.x, this.y);
    }

    tessellation() {
        return [this];
    }

    mirror(dest: SketchObject, mirroringFunc: Function) {
        let {x, y} = mirroringFunc(this.x, this.y);
        (dest as EndPoint).x = x;
        (dest as EndPoint).y = y;
    }

    referencePoint(): EndPoint {
        return this;
    }
}


export class BrushPoint extends EndPoint {

    constructor(x: number, y: number) {
        super(x, y);

        this.visible = false;

        this.__class = 'SKETCH.BrushPoint';
    }

    normalDistance(aim: Vector): number {
        return -1;
    }

    copy() {
        return new BrushPoint(this.x, this.y);
    }

}
