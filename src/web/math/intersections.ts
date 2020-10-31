const math = require('mathjs');

export const UNKNOWN = 0;
export const INTERSECTION = 10;
export const MULTIPLE_INTERSECTION = 11;
export const TANGENT_INTERSECTION = 12;
export const TOOL_EXTEND = 13;
export const TARGET_EXTEND = 14;
export const TARGET_TOOL_EXTEND = 15;

export const LEFTSIDE = 20;
export const RIGHTSIDE = 21;


export function lineLineValidation(tax: number, tay: number, tbx: number, tby: number,
                                   lax: number, lay: number, lbx: number, lby: number) {
    let status = UNKNOWN;

    const A = math.zeros(2, 2).toArray();
    A[0][0] = tbx - tax;
    A[0][1] = lax - lbx;
    A[1][0] = tby - tay;
    A[1][1] = lay - lby;

    const B = math.zeros(2).toArray();
    B[0] = lax - tax;
    B[1] = lay - tay;

    try {
        const [u, v] = math.lusolve(A, B);
        const px = tax + u * (tbx - tax);
        const py = tay + u * (tby - tay);

        const uValidate = u >= 0 && u <= 1;
        const vValidate = v >= 0 && v <= 1;

        if (uValidate && vValidate) {
            // it is the intersection point
            status = INTERSECTION;
        } else if (uValidate && !vValidate) {
            // the tool line will have an extend point
            status = TOOL_EXTEND;
        } else if (!uValidate && vValidate) {
            status = TARGET_EXTEND;
        } else if (!uValidate && !vValidate) {
            status = TARGET_TOOL_EXTEND;
        }

        return {
            status: status,
            error: 0,
            point: {
                x: px,
                y: py
            },
            params: {
                u: u,
                v: v
            }
        }
    } catch (e) {
        return {
            status: status,
            error: e
        }
    }
}


export function lineCircleValidation(lax: number, lay: number, lbx: number, lby: number,
                                     cx: number, cy: number, r: number) {
    const dx = lbx - lax;
    const dy = lby - lay;

    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (lax - cx) + dy * (lay - cy));
    const c = (lax - cx) * (lax - cx) + (lay - cy) * (lay - cy) - r * r;

    const d = b * b - 4 * a * c;
    if (math.smaller(a, 1.e-9) || math.smaller(d, -1.e-9)) {
        return {
            status: UNKNOWN,
            error: 0
        }
    }
    if (math.smaller(d, 1.e-9) && math.larger(d, -1.e-9)) {
        const t = -b / (2 * a);
        const px = lax + t * dx;
        const py = lay + t * dy;
        return {
            status: TANGENT_INTERSECTION,
            error: 0,
            point: {
                x: px,
                y: py
            },
            params: {
                t: t
            }
        }
    }

    const t = (-b + math.sqrt(d)) / (2 * a);
    const px1 = lax + t * dx;
    const py1 = lay + t * dy;

    const q = (-b - math.sqrt(d)) / (2 * a);
    const px2 = lax + q * dx;
    const py2 = lay + q * dy;

    const uValidate = t >= 0 && t <= 1;
    const vValidate = q >= 0 && q <= 1;

    if (uValidate && vValidate) {
        // it is the intersection point
        return {
            status: MULTIPLE_INTERSECTION,
            error: 0,
            point1: {
                x: px1,
                y: py1
            },
            point2: {
                x: px2,
                y: py2
            },
            params: {
                t: t,
                q: q
            }
        }
    } else if (uValidate && !vValidate) {
        // the tool line will have an extend point
        return {
            status: INTERSECTION,
            error: 0,
            point: {
                x: px1,
                y: py1
            },
            params: {
                t: t
            }
        }
    } else if (!uValidate && vValidate) {
        return {
            status: INTERSECTION,
            error: 0,
            point: {
                x: px2,
                y: py2
            },
            params: {
                t: q
            }
        }
    }

    return {
        status: UNKNOWN,
        error: 0
    }

}
