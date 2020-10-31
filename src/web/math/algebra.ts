import Vector from "@/web/math/vector";

export const TOLERANCE = 1E-6;
export const TOLERANCE_01 = TOLERANCE * 1e-2;
export const TOLERANCE_SQ = TOLERANCE * TOLERANCE;
export const EPSILON = 1e-12;


//  compare  number
function _areEqual(v1: number, v2: number, tolerance: number) {
    return Math.abs(v1 - v2) < tolerance;
}

//APIs
export function areEq(v1: number, v2: number, tolerance: number) {
    return _areEqual(v1, v2, tolerance);
}

export function eq(v1: number, v2: number) {
    return _areEqual(v1, v2, TOLERANCE);
}

export function ueq(v1: number, v2: number) {
    return _areEqual(v1, v2, TOLERANCE_01);
}

export function eqEps(a: number, b: number) {
    return _areEqual(a, b, EPSILON);
}

export function eqSq(a: number, b: number) {
    return _areEqual(a, b, TOLERANCE_SQ);
}


// compare vector
export function _distanceSquared3(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    let dz = z1 - z2;

    return dx * dx + dy * dy + dz * dz;
}

function _distanceSquaredAB3(a: Vector, b: Vector) {
    return _distanceSquared3(a.x, a.y, a.z, b.x, b.y, b.z);
}

function _distanceSquaredANegB3(a: Vector, b: Vector) {
    return _distanceSquared3(a.x, a.y, a.z, -b.x, -b.y, -b.z);
}


function _areVectorsEqual(v1: Vector, v2: Vector) {
    return _areEqual(_distanceSquaredAB3(v1, v2), 0, TOLERANCE_SQ);
}

function _areNegVectorsEqual(v1: Vector, v2: Vector) {
    return _areEqual(_distanceSquaredANegB3(v1, v2), 0, TOLERANCE_SQ);
}

function _areArraysEqual(v1: Array<number>, v2: Array<number>) {
    return _areEqual(_distanceSquared3(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]), 0, TOLERANCE_SQ);
}

// APIs
export function vecEq(a: Vector, b: Vector) {
    return _areVectorsEqual(a, b);
}

export function negVecEq(a: Vector, b: Vector) {
    return _areNegVectorsEqual(a, b);
}

export function arrEq(a: Array<number>, b: Array<number>) {
    return _areArraysEqual(a, b);
}

export function strictEq(a: Vector, b: Vector) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
}

// distance
export function distanceAB(a: Vector, b: Vector) {
    return distance(a.x, a.y, b.x, b.y);
}

function distance(x1: number, y1: number, x2: number, y2: number) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

export function distanceAB3(a: Vector, b: Vector) {
    return distance3(a.x, a.y, b.x, b.y, a.z, b.z);
}

function distance3(x1: number, y1: number, x2: number, y2: number, z1: number, z2: number) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    let dz = z1 - z2;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

