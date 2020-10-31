import {Expr} from "@/web/sketches/expressions/exprs";
import Param from "@/web/sketches/expressions/params";

export class ExprVector {

    public x: Expr;
    public y: Expr;

    constructor(x: Expr, y: Expr) {
        this.x = x;
        this.y = y;
    }

    get info() {
        return [this.x.info, this.y.info];
    }

    static fromParams(x: Param, y: Param) {
        const _x = Expr.fromParam(x);
        const _y = Expr.fromParam(y);

        return new ExprVector(_x, _y);
    }

    static fromExprs(x: Expr, y: Expr) {
        return new ExprVector(x, y);
    }

    minus(b: ExprVector) {
        return new ExprVector(this.x.minus(b.x), this.y.minus(b.y));
    }

    cross(b: ExprVector) {
        return this.x.times(b.y).minus(this.y.times(b.x));
    }

    scaledBy(s: Expr) {
        return new ExprVector(this.x.times(s), this.y.times(s));
    }

    negative() {
        const s = Expr.fromValue(-1);
        return this.scaledBy(s);
    }

    dot(b: ExprVector) {
        return (this.x.times(b.x)).plus(this.y.times(b.y));
    }

    withMagnitude(s: Expr) {
        const m = this.magnitude();
        return this.scaledBy(s.div(m));
    }

    magnitude() {
        return this.x.square().plus(this.y.square()).sqrt();
    }
}
