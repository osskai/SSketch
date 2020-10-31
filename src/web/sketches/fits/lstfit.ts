import Vector from "@/web/math/vector";


/**
 * ask the centroid point of the points
 * @param points
 * @constructor
 */
export function LSFIT_ask_pts_centroid_2d(points: Array<Vector>) {
    let pt = new Vector();
    for (let i = 0; i < points.length; ++i) {
        pt.x += points[i].x;
        pt.y += points[i].y;
    }

    pt.x /= points.length;
    pt.y /= points.length;

    return pt;
}

/**
 * copy the points
 * @param points
 * @constructor
 */
export function LSFIT_copy_pts_2d(points: Array<Vector>) {
    let copied_pts = new Array<Vector>(points.length);
    for (let i = 0; i < points.length; ++i) {
        copied_pts[i] = new Vector(points[i].x, points[i].y, points[i].z);
    }

    return copied_pts;
}


