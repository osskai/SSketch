import Param from "@/web/sketches/expressions/params";
import IdList from '@/web/utils/list';

const math = require('mathjs');

/**
 * expressions to represent
 */
export class Expr {

    static PARAM: number = 0;

    static CONSTANT = 20;
    static PLUS = 100;
    static MINUS = 101;
    static TIMES = 102;
    static DIV = 103;

    static NEGATE = 104;
    static SQRT = 105;
    static SQUARE = 106;

    static SIN = 107;
    static COS = 108;

    static NO_PARAMS: 10000;
    static MULTIPLE_PARAMS: 20000;

    // expressions iterator
    public a: Expr | null;
    public b: Expr | null;
    public op: number;

    // value
    private _param: Param | null;
    private _value: number;

    constructor(op: number = Expr.PARAM, b: Expr | null = null) {
        this.a = null;
        this.b = b;
        this.op = op;

        this._param = null;
        this._value = 0;
    }

    get info() {
        return [this.op, this.a, this.b, this._param, this._value];
    }

    get param() {
        return this._param as Param;
    }

    set param(param: Param) {
        this._param = param;
    }

    set value(value: number) {
        this._value = value;
    }

    get value() {
        if (this.op === Expr.PARAM) return this._param!.get();
        else return this._value;
    }

    nodes(): number {
        switch (this.children()) {
            case 0:
                return 1;
            case 1:
                return 1 + this.a!.nodes();
            case 2:
                return 1 + this.a!.nodes() + this.b!.nodes();
            default:
                return 0;
        }
    }

    children() {
        switch (this.op) {
            case Expr.PARAM:
            case Expr.CONSTANT:
                return 0;

            case Expr.PLUS:
            case Expr.MINUS:
            case Expr.TIMES:
            case Expr.DIV:
                return 2;

            case Expr.NEGATE:
            case Expr.SQRT:
            case Expr.SQUARE:
            case Expr.SIN:
            case Expr.COS:
                return 1;

            default:
                throw 'unsupported type';
        }
    }

    getParams(params: Array<Param>) {
        if (this.op === Expr.PARAM) {
            params.push(this._param!);
        }
        const c = this.children();
        if (c > 0) this.a!.getParams(params);
        if (c > 1) this.b!.getParams(params);
    }

    static fromParam(param: Param) {
        let expr = new Expr(Expr.PARAM, null);
        expr.param = param;

        return expr;
    }

    static fromValue(value: number) {
        let expr = new Expr(Expr.CONSTANT, null);
        expr.value = value;

        return expr;
    }

    anyOp(op: number, b: Expr | null) {
        const expr = new Expr(op, b);
        expr.a = this;

        return expr;
    }

    plus(b: Expr) {
        return this.anyOp(Expr.PLUS, b);
    }

    minus(b: Expr) {
        return this.anyOp(Expr.MINUS, b);
    }

    negative() {
        return this.anyOp(Expr.NEGATE, null);
    }

    times(b: Expr) {
        return this.anyOp(Expr.TIMES, b);
    }

    div(b: Expr) {
        return this.anyOp(Expr.DIV, b);
    }

    square() {
        return this.anyOp(Expr.SQUARE, null);
    }

    sqrt() {
        return this.anyOp(Expr.SQRT, null);
    }

    sin() {
        return this.anyOp(Expr.SIN, null);
    }

    cos() {
        return this.anyOp(Expr.COS, null);
    }

    clone() {
        let expr = new Expr(this.op, this.b);
        expr.a = this.a;

        if (this.op === Expr.PARAM) expr.param = this._param!;
        else expr.value = this._value;

        return expr;
    }

    deepCopy(firstTry: IdList<Param>) {
        let expr = this.clone();
        if (this.op === Expr.PARAM) {
            const param = firstTry.find(this._param!) as Param;
            if (param.know) {
                expr.op = Expr.CONSTANT;
                expr.value = this._param!.get();
            }
        }

        const c = this.children();
        if (c > 0) expr.a = this.a!.deepCopy(firstTry);
        if (c > 1) expr.b = this.b!.deepCopy(firstTry);

        return expr;
    }

    paramUsed(): boolean {
        let isUsed = false;
        if (this.op === Expr.PARAM) isUsed = isUsed || true;

        const c = this.children();
        if (c >= 1) isUsed = isUsed || this.a!.paramUsed();
        if (c >= 2) isUsed = isUsed || this.b!.paramUsed();

        return isUsed;
    }

    dependsOn(param: Param): boolean {
        if (this.op === Expr.PARAM) return param.id === this._param!.id;
        const c = this.children();
        if (c === 1) return this.a!.dependsOn(param);
        if (c === 2) return this.a!.dependsOn(param) || this.b!.dependsOn(param);
        return false;
    }

    static tol(a: number, b: number) {
        return math.abs(a - b) < 1.e-3;
    }

    eval(): number {
        switch (this.op) {
            case Expr.PARAM:
            case Expr.CONSTANT:
                return this.value;

            case Expr.PLUS:
                return this.a!.eval() + this.b!.eval();
            case Expr.MINUS:
                return this.a!.eval() - this.b!.eval();
            case Expr.TIMES:
                return this.a!.eval() * this.b!.eval();
            case Expr.DIV:
                return this.a!.eval() / this.b!.eval();

            case Expr.NEGATE:
                return -(this.a!.eval());
            case Expr.SQRT:
                return math.sqrt(this.a!.eval());
            case Expr.SQUARE:
                const r = this.a!.eval();
                return r * r;
            case Expr.SIN:
                return math.sin(this.a!.eval());
            case Expr.COS:
                return math.cos(this.a!.eval());
            default:
                throw 'unsupported type';
        }
    }

    derivative(param: Param): Expr {
        switch (this.op) {
            case Expr.PARAM:
                return Expr.fromValue(param.id === this._param!.id ? 1 : 0);
            case Expr.CONSTANT:
                return Expr.fromValue(0);

            case Expr.PLUS:
                return this.a!.derivative(param)!.plus(this.b!.derivative(param)!);
            case Expr.MINUS:
                return this.a!.derivative(param)!.minus(this.b!.derivative(param)!);

            case Expr.TIMES:
                const tda = this.a!.derivative(param)!;
                const tdb = this.b!.derivative(param)!;
                return this.a!.times(tdb).plus(this.b!.times(tda));

            case Expr.DIV:
                const dda = this.a!.derivative(param)!;
                const ddb = this.b!.derivative(param)!;
                return dda.times(this.b!).minus(this.a!.times(ddb)).div(this.b!.square());

            case Expr.NEGATE:
                return this.a!.derivative(param)!.negative();
            case Expr.SQRT:
                return Expr.fromValue(0.5).div(this.a!.sqrt()).times(this.a!.derivative(param)!);
            case Expr.SQUARE:
                return Expr.fromValue(2).times(this.a!).times(this.a!.derivative(param)!);

            default:
                throw 'unsupported type';
        }
    }

    substitute(oldP: number, newP: Param) {
        if (this.op === Expr.PARAM && this._param!.id === oldP) {
            this._param!.set(newP.get());
        }
        const c = this.children();
        if (c > 0) this.a!.substitute(oldP, newP);
        if (c > 1) this.b!.substitute(oldP, newP);
    }

    referencedParams(params: IdList<Param>): number {
        if(this.op === Expr.PARAM) {
            if(params.find(this._param!)) {
                return this._param!.id;
            } else {
                return Expr.NO_PARAMS;
            }
        }

        const c = this.children();
        if (c === 0) return Expr.NO_PARAMS;
        else if (c === 1) return this.a!.referencedParams(params);
        else if (c === 2) {
            const ia = this.a!.referencedParams(params);
            const ib = this.b!.referencedParams(params);
            if(ia === Expr.NO_PARAMS) {
                return ib;
            } else if(ib === Expr.NO_PARAMS) {
                return ia;
            } else if(ia === ib) {
                return ia; // either, doesn't matter
            } else {
                return Expr.MULTIPLE_PARAMS;
            }
        }

        throw 'cannot find the referenced params';
    }
}

/**
 * handle of the expressions
 */
export class Equation {

    public id: number;
    public expr: Expr;

    // for the solver usage
    public tag: number;

    constructor(e: Expr) {
        this.id = -1;
        this.expr = e;

        this.tag = 0;
    }

    get info() {
        return [this.id, this.expr.info];
    }

    visitParams(callback: Function) {
        let params: Array<Param> = [];
        this.expr.getParams(params);

        params.forEach((param) => callback(param));
    }

}
