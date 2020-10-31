import {distance, dot, perp2d, sub} from "@/web/math/vec";
import EndPoint from "@/web/sketches/shapes/point";
import {eq} from "@/web/math/algebra";


export function pointToLineSignedDistance(ax: number, ay: number, bx: number, by: number,
                                          px: number, py: number) {
    let nx = -(by - ay);
    let ny = bx - ax;

    const d = distance([ax, ay], [bx, by]);

    nx /= d;
    ny /= d;

    let vx = px - ax;
    let vy = py - ay;

    const proj = vx * ny + vy * (-nx);

    //Check if vector b lays on the vector ab
    if (proj > d) {
        return Number.NaN;
    }

    if (proj < 0) {
        return Number.NaN;
    }

    return vx * nx + vy * ny;
}


export function lineLineIntersection2d(p1: Array<number>, p2: Array<number>, v1: Array<number>, v2: Array<number>) {
    const n2 = perp2d(v2);
    const cos = dot(n2, v1);
    if (eq(cos, 0)) {
        return null;
    }
    const u1 = dot(n2, sub(p2, p1)) / cos;

    return [p1[0] + v1[0] * u1, p1[1] + v1[1] * u1];
}


export function findCenter(aa: EndPoint, ab: EndPoint, ba: EndPoint, bb: EndPoint,
                           avx: number, avy: number, bvx: number, bvy: number) {
    let center = lineLineIntersection2d([aa.x, aa.y], [ba.x, ba.y], [avx, avy], [bvx, bvy]);
    if (!center) {
        let commonPt = null;
        aa.visitLinked((p: EndPoint) => {
            if (ba === p || bb === p) {
                commonPt = aa;
            }
        });
        if (!commonPt) {
            ab.visitLinked((p: EndPoint) => {
                if (ba === p || bb === p) {
                    commonPt = ab;
                }
            });

        }
        if (!commonPt) {
            return null;
        }
        center = (commonPt as EndPoint).data();
    }
    return center;
}
