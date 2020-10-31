import Vector from "@/web/math/vector";
import {LSFIT_ask_pts_centroid_2d, LSFIT_copy_pts_2d} from "@/web/sketches/fits/lstfit";

const math = require('mathjs');

/**
 *
 * @param pts
 */
export default function fit_circle(pts: Array<Vector>) {
    const fit_res = LSFIT_circle_to_points_2d(pts);

    // calculate the angles to determine the arc and circle
    let angles: Array<number> = [];
    for (let pt of pts) {
        let sinA = 0, cosA = 0;
        const sub_vec = pt.minus(fit_res.center);
        const mag = sub_vec.length();
        if (mag > 1.e-6) {
            cosA = sub_vec.x / mag;
            sinA = sub_vec.y / mag;
        }

        let angle = Math.acos(cosA);
        if (sinA < 0) {
            angle = 2 * Math.PI - angle;
        }
        angles.push(angle);
    }

    let start_angle = angles[0];
    let end_angle = angles[pts.length - 1];

    angles.sort();

    const min_angle = angles[0];
    const max_angle = angles[pts.length - 1];

    angles.push(min_angle + 2 * Math.PI);

    // find the largest gap
    let max_gap = 0;
    let max_gap_index = 0;
    for (let i = 0; i < pts.length; ++i) {
        const gap = angles[i + 1] - angles[i];
        if (gap > max_gap) {
            max_gap = gap;
            max_gap_index = i;
        }
    }
    if (max_gap_index === pts.length - 1) {
        start_angle = min_angle;
        end_angle = max_angle;
    } else {
        start_angle = angles[max_gap_index + 1];
        end_angle = angles[max_gap_index] + 2 * Math.PI;
    }

    let full_circle = false;
    const angle_span = Math.abs(end_angle - start_angle);
    if (angle_span > 0.95 * 2 * Math.PI) {
        full_circle = true;
    } else {
        let gap_arclen = fit_res.radius * (2 * Math.PI - angle_span);
        if (gap_arclen < 1.e-6) {
            full_circle = true;
        }
    }

    if (!full_circle) {
        const sweep_angles = compute_sweeping_angles(pts, fit_res.center);
        start_angle = start_angle - sweep_angles[1];
        end_angle = start_angle + sweep_angles[0];
    }

    if (full_circle) {
        start_angle = 0;
        end_angle = 2 * Math.PI;
    } else if (start_angle > 2 * Math.PI) {
        start_angle -= 2 * Math.PI;
        end_angle -= 2 * Math.PI;
    }

    return {
        err: fit_res.err,
        center: fit_res.center,
        radius: fit_res.radius,
        full_angle: full_circle,
        start_angle: start_angle,
        end_angle: end_angle
    }
}

/**
 *
 * @param pts
 * @param center
 */
function compute_sweeping_angles(pts: Array<Vector>, center: Vector) {
    let sum_angle = 0;
    let max_pos_angle = 0, max_neg_angle = 0;

    let vec1 = pts[0].minus(center);
    for (let i = 1; i < pts.length; ++i) {
        const vec2 = pts[i].minus(center);
        const cross_res = vec1.dot(vec2);
        const angle = Math.acos(cross_res / (vec1.length() * vec2.length()));

        sum_angle += angle;
        if (sum_angle > 0) {
            if (sum_angle > max_pos_angle) {
                max_pos_angle = sum_angle;
            }
        } else {
            if (Math.abs(sum_angle) > max_neg_angle) {
                max_neg_angle = Math.abs(sum_angle);
            }
        }

        vec1 = vec2;
    }

    if (max_pos_angle > 2 * Math.PI) {
        max_pos_angle = 2 * Math.PI;
    }

    if (max_neg_angle > 2 * Math.PI) {
        max_neg_angle = 2 * Math.PI;
    }

    return [max_pos_angle, max_neg_angle];
}


/**
 * fit teh circle
 * @param pts
 * @constructor
 */
function LSFIT_circle_to_points_2d(pts: Array<Vector>) {
    let copied_pts = LSFIT_copy_pts_2d(pts);
    const cen_pt = LSFIT_ask_pts_centroid_2d(copied_pts);
    for (let pt of copied_pts) {
        pt._minus(cen_pt);
    }

    let sum_c = 0;
    let a_2d = math.zeros(2, 2).toArray();
    let b_1d = math.zeros(2).toArray();
    for (let pt of copied_pts) {
        // A
        a_2d[0][0] += pt.x * pt.x;
        a_2d[0][1] += pt.x * pt.y;

        a_2d[1][1] += pt.y * pt.y;
        // B
        b_1d[0] -= (pt.x * pt.x * pt.x + pt.x * pt.y * pt.y);
        b_1d[1] -= (pt.x * pt.x * pt.y + pt.y * pt.y * pt.y);
        // sum_c
        sum_c -= (pt.x * pt.x + pt.y * pt.y);
    }
    a_2d[1][0] = a_2d[0][1];

    // solve Ax = b;
    const [ca, cb] = math.lusolve(a_2d, b_1d);
    const cc = sum_c / copied_pts.length;

    const center = new Vector(ca / -2, cb / -2)._plus(cen_pt);
    const radius = Math.sqrt(Math.abs(ca * ca + cb * cb - 4 * cc)) / 2;

    const err = LSFIT__get_ls_circle_error(copied_pts, ca, cb, cc);

    return {
        center: center,
        radius: radius,
        err: err
    }
}

/**
 * some errors needed to be deal with
 * @param pts
 * @param a
 * @param b
 * @param c
 * @constructor
 */
function LSFIT__get_ls_circle_error(pts: Array<Vector>, a: number, b: number, c: number) {
    let sum_error = 0, max_error = 0;
    for (let pt of pts) {
        const dis = Math.sqrt(Math.abs(pt.x * pt.x + pt.y * pt.y + a * pt.x + b * pt.y + c));
        sum_error += dis;

        if (dis > max_error) {
            max_error = dis;
        }
    }

    return {
        ave_error: sum_error / pts.length,
        max_error: max_error
    };
}
