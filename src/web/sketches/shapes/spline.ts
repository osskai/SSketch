import EndPoint from "@/web/sketches/shapes/point";
import SketchObject from "@/web/sketches/shapes/object";
import Vector from "@/web/math/vector";


export default class Spline extends SketchObject {

    constructor(start: EndPoint) {
        super();

        this.addChild(start);

        this.__class = "SKETCH.Spline";
    }

    visitParams(callback: Function) {
    }

    translateImpl(dx: number, dy: number) {
        this.children.forEach((child: SketchObject) => {
            child.translateImpl(dx, dy);
        })
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
        if (this.children.length < 2) return;

        const startPoint = this.referencePoint() as EndPoint;

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.curve(this.children as Array<EndPoint>);
        ctx.stroke();
    }

    copy() {
        const spline = new Spline(this.referencePoint());
        this.children.forEach((child) => {
            spline.children.push(child.copy())
        });
        return spline;
    }

    referencePoint() {
        return this.children[0] as EndPoint;
    }

    normalDistance(aim: Vector, scale: number): number {
        return 20;
    }

}


/**
 * Draws a cardinal spline through given point array. Points must be arranged
 * @param {Array} points - point array
 * @param {Number} [tension=0.5] - tension. Typically between [0.0, 1.0] but can be exceeded
 * @param {Number} [numOfSeg=20] - number of segments between two points (line resolution)
 * @param {Boolean} [closed=false] - Close the ends making the line continuous
 * @returns {Array} New array with the calculated points that was added to the path
 */
CanvasRenderingContext2D.prototype.curve = function (points: Array<EndPoint>,
                                                     tension?: number, numOfSeg?: number, closed?: boolean) {
    // options or defaults
    tension = tension || 0.5;
    numOfSeg = numOfSeg || 20;
    closed = closed || false;

    let pts: Array<number> = [];
    points.forEach((point: EndPoint) => {
        pts.push(point.x, point.y);
    });
    const il = points.length;

    if (closed) {
        pts.unshift(points[il - 1].y); // insert end point as first point
        pts.unshift(points[il - 1].x);
        pts.push(points[0].x, points[0].y); // first point as last point
    } else {
        pts.unshift(points[0].y);	// copy 1. point and insert at beginning
        pts.unshift(points[0].x);
        pts.push(points[il - 1].x, points[il - 1].y);	// duplicate end-points
    }

    // cache inner-loop calculations as they are based on t alone
    let cache = new Float32Array((numOfSeg + 2) * 4);
    cache[0] = 1;

    let cachePtr = 4;
    for (let i = 1; i < numOfSeg; i++) {
        const st = i / numOfSeg,
            st2 = st * st,
            st3 = st2 * st,
            st23 = st3 * 2,
            st32 = st2 * 3;

        cache[cachePtr++] = st23 - st32 + 1;	// c1
        cache[cachePtr++] = st32 - st23;		// c2
        cache[cachePtr++] = st3 - 2 * st2 + st;	// c3
        cache[cachePtr++] = st3 - st2;			// c4
    }

    cache[++cachePtr] = 1;

    // calc. points
    const l = pts.length;
    let result: Array<number> = [];

    parse(pts, cache, l);

    if (closed) {
        //l = points.length;
        pts = [];
        pts.push(points[il - 2].x, points[il - 2].y, points[il - 1].x, points[il - 1].y); // second last and last
        pts.push(points[0].x, points[0].y, points[1].x, points[1].y); // first and second
        parse(pts, cache, 4);
    }

    function parse(pts: Array<number>, cache: Float32Array, l: number) {
        for (let i = 2; i < l; i += 2) {
            const pt1 = pts[i],
                pt2 = pts[i + 1],
                pt3 = pts[i + 2],
                pt4 = pts[i + 3],

                t1x = (pt3 - pts[i - 2]) * tension!,
                t1y = (pt4 - pts[i - 1]) * tension!,
                t2x = (pts[i + 4] - pt1) * tension!,
                t2y = (pts[i + 5] - pt2) * tension!;

            for (let t = 0; t <= numOfSeg!; t++) {
                const c = t * 4;
                result.push(cache[c] * pt1 + cache[c + 1] * pt3 + cache[c + 2] * t1x + cache[c + 3] * t2x,
                    cache[c] * pt2 + cache[c + 1] * pt4 + cache[c + 2] * t1y + cache[c + 3] * t2y);
            }
        }
    }

    // add lines to path
    for (let i = 0, l = result.length; i < l; i += 2)
        this.lineTo(result[i], result[i + 1]);

    return result;
};
