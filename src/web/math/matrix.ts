import Vector from "@/web/math/vector";
import {AXIS} from "@/web/math/space";

/**
 * Matrix for the transformation
 */
export default class Matrix3 {
    // x
    public mxx: number;
    public mxy: number;
    public mxz: number;
    tx: number;

    // y
    public myx: number;
    public myy: number;
    public myz: number;
    ty: number;

    // z
    public mzx: number;
    public mzy: number;
    public mzz: number;
    tz: number;

    // special function to use
    apply = (vec: Readonly<Vector>) => this.__apply(vec, new Vector());

    constructor() {
        this.mxx = 1;
        this.mxy = 0;
        this.mxz = 0;
        this.tx = 0;
        this.myx = 0;
        this.myy = 1;
        this.myz = 0;
        this.ty = 0;
        this.mzx = 0;
        this.mzy = 0;
        this.mzz = 1;
        this.tz = 0;
    }

    translate(dx: number, dy: number, dz: number) {
        this.tx += dx;
        this.ty += dy;
        this.tz += dz;
        return this;
    }

    data() {
        return [
            [this.mxx, this.mxy, this.mxz, this.tx],
            [this.myx, this.myy, this.myz, this.ty],
            [this.mzx, this.mzy, this.mzz, this.tz]
        ];
    }

    _apply(vector: Vector) {
        return this.__apply(vector, vector);
    }

    __apply(vector: Readonly<Vector>, out: Vector) {
        let x = vector.x;
        let y = vector.y;
        let z = vector.z;

        out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
        out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
        out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;

        return out;
    }

    setBasisAxises(x: Vector, y: Vector, z: Vector) {
        this.mxx = x.x;
        this.mxy = y.x;
        this.mxz = z.x;
        this.tx = 0;
        this.myx = x.y;
        this.myy = y.y;
        this.myz = z.y;
        this.ty = 0;
        this.mzx = x.z;
        this.mzy = y.z;
        this.mzz = z.z;
        this.tz = 0;

        return this;
    }

    set34(
        mxx: number, mxy: number, mxz: number, tx: number,
        myx: number, myy: number, myz: number, ty: number,
        mzx: number, mzy: number, mzz: number, tz: number
    ) {
        this.mxx = mxx;
        this.mxy = mxy;
        this.mxz = mxz;
        this.tx = tx;
        this.myx = myx;
        this.myy = myy;
        this.myz = myz;
        this.ty = ty;
        this.mzx = mzx;
        this.mzy = mzy;
        this.mzz = mzz;
        this.tz = tz;

        return this;
    }

    combine(transform: Matrix3, out?: Matrix3) {
        let txx = transform.mxx;
        let txy = transform.mxy;
        let txz = transform.mxz;
        let ttx = transform.tx;
        let tyx = transform.myx;
        let tyy = transform.myy;
        let tyz = transform.myz;
        let tty = transform.ty;
        let tzx = transform.mzx;
        let tzy = transform.mzy;
        let tzz = transform.mzz;
        let ttz = transform.tz;

        let m = out || new Matrix3();
        m.mxx = (this.mxx * txx + this.mxy * tyx + this.mxz * tzx);
        m.mxy = (this.mxx * txy + this.mxy * tyy + this.mxz * tzy);
        m.mxz = (this.mxx * txz + this.mxy * tyz + this.mxz * tzz);
        m.tx = (this.mxx * ttx + this.mxy * tty + this.mxz * ttz + this.tx);
        m.myx = (this.myx * txx + this.myy * tyx + this.myz * tzx);
        m.myy = (this.myx * txy + this.myy * tyy + this.myz * tzy);
        m.myz = (this.myx * txz + this.myy * tyz + this.myz * tzz);
        m.ty = (this.myx * ttx + this.myy * tty + this.myz * ttz + this.ty);
        m.mzx = (this.mzx * txx + this.mzy * tyx + this.mzz * tzx);
        m.mzy = (this.mzx * txy + this.mzy * tyy + this.mzz * tzy);
        m.mzz = (this.mzx * txz + this.mzy * tyz + this.mzz * tzz);
        m.tz = (this.mzx * ttx + this.mzy * tty + this.mzz * ttz + this.tz);

        return m;
    }

    invert() {
        return this.__invert(new Matrix3());
    }

    _invert() {
        return this.__invert(this);
    }

    private __invert(out: Matrix3) {
        let det =
            this.mxx * (this.myy * this.mzz - this.mzy * this.myz) +
            this.mxy * (this.myz * this.mzx - this.mzz * this.myx) +
            this.mxz * (this.myx * this.mzy - this.mzx * this.myy);

        if (det === 0.0) {
            return undefined;
        }

        let cxx = this.myy * this.mzz - this.myz * this.mzy;
        let cyx = -this.myx * this.mzz + this.myz * this.mzx;
        let czx = this.myx * this.mzy - this.myy * this.mzx;
        let cxt = -this.mxy * (this.myz * this.tz - this.mzz * this.ty)
            - this.mxz * (this.ty * this.mzy - this.tz * this.myy)
            - this.tx * (this.myy * this.mzz - this.mzy * this.myz);
        let cxy = -this.mxy * this.mzz + this.mxz * this.mzy;
        let cyy = this.mxx * this.mzz - this.mxz * this.mzx;
        let czy = -this.mxx * this.mzy + this.mxy * this.mzx;
        let cyt = this.mxx * (this.myz * this.tz - this.mzz * this.ty)
            + this.mxz * (this.ty * this.mzx - this.tz * this.myx)
            + this.tx * (this.myx * this.mzz - this.mzx * this.myz);
        let cxz = this.mxy * this.myz - this.mxz * this.myy;
        let cyz = -this.mxx * this.myz + this.mxz * this.myx;
        let czz = this.mxx * this.myy - this.mxy * this.myx;
        let czt = -this.mxx * (this.myy * this.tz - this.mzy * this.ty)
            - this.mxy * (this.ty * this.mzx - this.tz * this.myx)
            - this.tx * (this.myx * this.mzy - this.mzx * this.myy);

        out.mxx = cxx / det;
        out.mxy = cxy / det;
        out.mxz = cxz / det;
        out.tx = cxt / det;
        out.myx = cyx / det;
        out.myy = cyy / det;
        out.myz = cyz / det;
        out.ty = cyt / det;
        out.mzx = czx / det;
        out.mzy = czy / det;
        out.mzz = czz / det;
        out.tz = czt / det;
        return out;
    }

    rotate(angle: number, axis: Vector, pivot: Readonly<Vector>) {
        return Matrix3.rotateMatrix(angle, axis, pivot, this);
    }

    static rotateMatrix(angle: number, axis: Vector, pivot: Readonly<Vector>, matrix?: Matrix3) {
        let sin = Math.sin(angle);
        let cos = Math.cos(angle);
        let axisX, axisY, axisZ;
        let m = matrix || new Matrix3();

        if (axis === AXIS.X || axis === AXIS.Y || axis === AXIS.Z) {
            axisX = axis.x;
            axisY = axis.y;
            axisZ = axis.z;
        } else {
            // normalize
            let mag = axis.length();
            if (mag == 0.0) {
                return m;
            } else {
                axisX = axis.x / mag;
                axisY = axis.y / mag;
                axisZ = axis.z / mag;
            }
        }

        let px = pivot.x;
        let py = pivot.y;
        let pz = pivot.z;

        m.mxx = cos + axisX * axisX * (1 - cos);
        m.mxy = axisX * axisY * (1 - cos) - axisZ * sin;
        m.mxz = axisX * axisZ * (1 - cos) + axisY * sin;

        m.tx = px * (1 - m.mxx) - py * m.mxy - pz * m.mxz;

        m.myx = axisY * axisX * (1 - cos) + axisZ * sin;
        m.myy = cos + axisY * axisY * (1 - cos);
        m.myz = axisY * axisZ * (1 - cos) - axisX * sin;
        m.ty = py * (1 - m.myy) - px * m.myx - pz * m.myz;

        m.mzx = axisZ * axisX * (1 - cos) - axisY * sin;
        m.mzy = axisZ * axisY * (1 - cos) + axisX * sin;
        m.mzz = cos + axisZ * axisZ * (1 - cos);
        m.tz = pz * (1 - m.mzz) - px * m.mzx - py * m.mzy;

        return m;
    }
}


