function _scalarOperand(v: number[], out: number[], func: Function) {
    for (let i = 0; i < v.length; i++) {
        out[i] = func(v[i]);
    }

    return out;
}

function _vectorOperand(v1: number[], v2: number[], out: number[], func: Function) {
    for (let i = 0; i < v1.length; i++) {
        out[i] = func(v1[i], v2[i]);
    }
    return out;
}

// *
function __mul(v: number[], scalar: number, out: number[]) {
    return _scalarOperand(v, out, (x: number) => x * scalar);
}

export function _mul(v: number[], scalar: number) {
    return __mul(v, scalar, v);
}

export function mul(v: number[], scalar: number) {
    return __mul(v, scalar, []);
}

// /
function __div(v: number[], scalar: number, out: number[]) {
    return _scalarOperand(v, out, (x: number) => x / scalar);
}

export function _div(v: number[], scalar: number) {
    return __div(v, scalar, v);
}

export function div(v: number[], scalar: number) {
    return __div(v, scalar, []);
}


// +
function __add(v1: number[], v2: number[], out: number[]) {
    return _vectorOperand(v1, v2, out, (x1: number, x2: number) => x1 + x2);
}

export function _add(v1: number[], v2: number[]) {
    return __add(v1, v2, v1);
}

export function add(v1: number[], v2: number[]) {
    return __add(v1, v2, []);
}


// -
function __sub(v1: number[], v2: number[], out: number[]) {
    return _vectorOperand(v1, v2, out, (x1: number, x2: number) => x1 - x2);
}

export function _sub(v1: number[], v2: number[]) {
    return __sub(v1, v2, v1);
}

export function sub(v1: number[], v2: number[]) {
    return __sub(v1, v2, []);
}


// negate
function __negate(v: number[], out: number[]) {
    return _scalarOperand(v, out, (x: number) => -x);
}

export function _negate(v: number[]) {
    return __negate(v, v);
}

export function negate(v: number[]) {
    return __negate(v, []);
}


// others
export function dot(v1: number[], v2: number[]) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
}

function __cross(v1: number[], v2: number[], out: number[]) {
    out[0] = v1[1] * v2[2] - v1[2] * v2[1];
    out[1] = v1[2] * v2[0] - v1[0] * v2[2];
    out[2] = v1[0] * v2[1] - v1[1] * v2[0];

    return out;
}

export function cross(v1: number[], v2: number[]) {
    return __cross(v1, v2, []);
}

export function cross2d(v1: number[], v2: number[]) {
    return v1[0] * v2[1] - v1[1] * v2[0];
}


// normalize
function __normalize(v: number[], out: number[]) {
    const mag = length(v);
    if (mag === 0.0) {
        out[0] = out[1] = out[2] = 0;
    }
    return __div(v, mag, out)
}

export function _normalize(v: number[]) {
    return __normalize(v, v);
}

export function normalize(v: number[]) {
    return __normalize(v, []);
}


export function lengthSq(v: number[]) {
    return dot(v, v);
}

export function length(v: number[]) {
    return Math.sqrt(lengthSq(v));
}


// copy
export function copy(to: number[], from: number[]) {
    for (let i = 0; i < to.length; i++) {
        to[i] = from[i];
    }

    return to;
}

export function clone(v: number[]) {
    return copy(create(v.length), v);
}

function create(dim: number) {
    let out = [];
    for (let i = 0; i < dim; i++) {
        out[i] = 0;
    }
    return out;
}

export function init1zero(dim: number) {
    return create(dim);
}

const sq = (v: number) => v * v;


export function distanceSq(v1: number[], v2: number[]) {
    let dSq = 0;
    for (let i = 0; i < v1.length; i++) {
        dSq += sq(v1[i] - v2[i]);
    }
    return dSq;
}

export function distance(v1: number[], v2: number[]) {
    return Math.sqrt(distanceSq(v1, v2));
}


export function perp2d(v: Array<number>) {
    return __perp2d(v, []);
}

export function _perp2d(v: Array<number>) {
    return __perp2d(v, v);
}

function __perp2d([x, y]: Array<number>, out: Array<number>) {
    out[0] = -y;
    out[1] = x;
    return out;
}

export function fillArray(a: Array<any>, fromIndex: number, toIndex: number, val: any) {
    for (let i = fromIndex; i < toIndex; i++) {
        a[i] = val;
    }
    return a;
}
