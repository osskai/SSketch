const math = require('mathjs');

/**
 * Vector
 */
export default class Vector {

    public x: number;
    public y: number;
    public z: number;

    constructor(x?: number, y?: number, z?: number) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    setFromXYZ(x: number, y?: number, z?: number) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        return this;
    }

    setFromArray(data: number[]) {
        this.x = data[0] || 0;
        this.y = data[1] || 0;
        this.z = data[2] || 0;
        return this;
    }

    setFromVector(data: Vector) {
        this.x = data.x;
        this.y = data.y;
        this.z = data.z;

        return this;
    }

    static createFromArray(data: Array<number>) {
        return new Vector().setFromArray(data);
    }

    abs() {
        return new Vector(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }

    equals(other: Vector) {
        return (this.x === other.x) && (this.y === other.y) && (this.z === other.z);
    }

    multiply(scalar: number) {
        return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    _multiply(scalar: number) {
        return this.setFromXYZ(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    divide(scalar: number) {
        return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    _divide(scalar: number) {
        return this.setFromXYZ(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    dot(vector: Readonly<Vector>) {
        return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }

    copy(from: Readonly<Vector>) {
        this.x = from.x;
        this.y = from.y;
        this.z = from.z;

        return this;
    }

    clone() {
        return new Vector(this.x, this.y, this.z);
    }

    length() {
        return Math.sqrt(this.lengthSquared());
    };

    lengthSquared() {
        return this.dot(this);
    }

    distanceToSquared(a: Vector) {
        return this.minus(a).lengthSquared();
    }

    distanceTo(a: Vector) {
        return Math.sqrt(this.distanceToSquared(a));
    }

    minus(vector: Vector) {
        return new Vector(this.x - vector.x, this.y - vector.y, this.z - vector.z);
    }

    _minus(vector: Vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;

        return this;
    }

    plus(vector: Vector) {
        return new Vector(this.x + vector.x, this.y + vector.y, this.z + vector.z);
    }

    _plus(vector: Vector) {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;

        return this;
    }

    normalize() {
        let mag = this.length();
        if (mag === 0.0) {
            return new Vector(0.0, 0.0, 0.0);
        }
        return new Vector(this.x / mag, this.y / mag, this.z / mag);
    }

    _normalize() {
        let mag = this.length();
        if (mag === 0.0) {
            return this.setFromXYZ(0, 0, 0)
        }
        return this._divide(mag);
    };

    cross(a: Readonly<Vector>) {
        return this.clone()._cross(a);
    };

    _cross(a: Readonly<Vector>) {
        return this.setFromXYZ(
            this.y * a.z - this.z * a.y,
            this.z * a.x - this.x * a.z,
            this.x * a.y - this.y * a.x
        );
    };

    negate() {
        return this.multiply(-1);
    }

    _negate() {
        return this._multiply(-1);
    }

    rotateZ(angle: number) {
        const matrix = math.zeros(2, 2).toArray();
        matrix[0][0] = math.cos(angle);
        matrix[0][1] = -math.sin(angle);
        matrix[1][0] = math.sin(angle);
        matrix[1][1] = math.cos(angle);

        const data2 = [this.x, this.y];
        const ans = math.multiply(matrix, data2);

        return new Vector(ans[0], ans[1], 0);
    }

    private toArray() {
        return [this.x, this.y, this.z];
    }

    data() {
        return this.toArray();
    }

    roundToPrecision(number: number) {
        this.x.toFixed(number);
        this.y.toFixed(number);
        this.z.toFixed(number);
    }
}
