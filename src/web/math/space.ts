import Vector from "@/web/math/vector";
import Matrix3 from "@/web/math/matrix";
import {cross, lengthSq, normalize} from "@/web/math/vec";


export const AXIS_X3 = [1, 0, 0];
export const AXIS_Y3 = [0, 1, 0];
export const AXIS_Z3 = [0, 0, 1];
export const ORIGIN3 = [0, 0, 0];
export const BASIS3 = [AXIS_X3, AXIS_Y3, AXIS_Z3];


const freeze = Object.freeze;

export const ORIGIN = freeze(new Vector(0, 0, 0));

export const AXIS = freeze({
    X: freeze(new Vector(1, 0, 0)),
    Y: freeze(new Vector(0, 1, 0)),
    Z: freeze(new Vector(0, 0, 1))
});

export const IDENTITY_BASIS = Object.freeze([AXIS.X, AXIS.Y, AXIS.Z]);

export const STANDARD_BASES = freeze({
    'XY': IDENTITY_BASIS,
    'XZ': [AXIS.X, AXIS.Z, AXIS.Y],
    'ZY': [AXIS.Z, AXIS.Y, AXIS.X]
});

export const DEG_RAD = Math.PI / 180.0;

export const _360 = 2 * Math.PI;
export const _90 = 0.5 * Math.PI;
export const _270 = 1.5 * Math.PI;


export function makeAngle0_360(angle: number) {
    angle %= _360;
    if (angle < 0) {
        angle = _360 + angle;
    }
    return angle;
}

/**
 * plane basis
 * @param normal
 * @param alignY
 * @param alignZ
 */
export function basisForPlane(normal: Vector, alignY = AXIS.Y, alignZ = AXIS.Z) {
    let alignPlane;
    if (Math.abs(normal.dot(alignY)) < 0.5) {
        alignPlane = normal.cross(alignY);
    } else {
        alignPlane = normal.cross(alignZ);
    }

    let y = alignPlane.cross(normal);
    let x = y.cross(normal);
    return [x, y, normal];
}

export function perpendicularVector(v: Array<number>) {
    v = normalize(v);
    return BASIS3.map(axis => cross(axis, v)).sort((a, b) => lengthSq(b) - lengthSq(a))[0];
}

/**
 * Csys
 */
export default class Csys {

    public origin: Vector;
    public x: Vector;
    public y: Vector;
    public z: Vector;
    private _outTr: Matrix3 | undefined;

    static fromNormalAndDir(origin: Vector, normal: Vector, dir: Vector) {
        return new Csys(origin, dir, normal.cross(dir), normal)
    }

    static origin() {
        return new Csys(ORIGIN.clone(), AXIS.X.clone(), AXIS.Y.clone(), AXIS.Z.clone());
    }

    constructor(origin: Vector, x: Vector, y: Vector, z: Vector) {
        this.origin = origin;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    w() {
        return this.z.dot(this.origin);
    }

    copy(csys: Csys) {
        this.origin.copy(csys.origin);
        this.x.copy(csys.x);
        this.y.copy(csys.y);
        this.z.copy(csys.z);
    }

    clone() {
        return new Csys(this.origin.clone(), this.x.clone(), this.y.clone(), this.z.clone());
    }

    get outTransformation() {
        if (this._outTr === undefined) {
            const mx = new Matrix3().setBasisAxises(this.x, this.y, this.z);
            mx.tx = this.origin.x;
            mx.ty = this.origin.y;
            mx.tz = this.origin.z;

            this._outTr = mx;
        }

        return this._outTr;
    }
}

export const CSYS_ORIGIN: Csys = Csys.origin();

Object.freeze(CSYS_ORIGIN.origin);
Object.freeze(CSYS_ORIGIN.x);
Object.freeze(CSYS_ORIGIN.y);
Object.freeze(CSYS_ORIGIN.z);
