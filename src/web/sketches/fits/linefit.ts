import Vector from "@/web/math/vector";
import {LSFIT_ask_pts_centroid_2d, LSFIT_copy_pts_2d} from "@/web/sketches/fits/lstfit";

const math = require('mathjs');


/**
 * fit the line
 * @param pts
 */
export default function fit_line(pts: Array<Vector>) {
    const fit_res = LSFIT_line_to_points_2d(pts);

    // find the start and end point
    let interval0 = 0, interval1 = 0;
    for (let pt of pts) {
        const sub_vec = pt.minus(fit_res.loc);
        const dot_res = sub_vec.dot(fit_res.dir);
        if (dot_res > interval1) {
            interval1 = dot_res;
        }
        if (dot_res < interval0) {
            interval0 = dot_res;
        }
    }

    let start_point = new Vector();
    start_point.x = fit_res.loc.x + interval0 * fit_res.dir.x;
    start_point.y = fit_res.loc.y + interval0 * fit_res.dir.y;

    let end_point = new Vector();
    end_point.x = fit_res.loc.x + interval1 * fit_res.dir.x;
    end_point.y = fit_res.loc.y + interval1 * fit_res.dir.y;

    return {
        a: start_point,
        b: end_point,
        err: fit_res.err
    };
}


/**
 * using the matrix to get the parameters
 * min Qu
 * sub u^2 = 1
 * @param pts
 * @constructor
 */
function LSFIT_line_to_points_2d(pts: Array<Vector>) {
    let copied_pts = LSFIT_copy_pts_2d(pts);
    const cen_pt = LSFIT_ask_pts_centroid_2d(copied_pts);
    for (let pt of copied_pts) {
        pt._minus(cen_pt);
    }

    // initialize the matrix Q
    let q_2d = math.zeros(2, 2).toArray();
    for (const pt of copied_pts) {
        q_2d[0][0] += pt.x * pt.x;
        q_2d[0][1] += pt.x * pt.y;

        q_2d[1][1] += pt.y * pt.y;
    }
    q_2d[1][0] = q_2d[0][1];

    // the eigens and values of the matrix Q
    const ans = math.eigs(q_2d);
    const d = ans.values;
    const v_2d = ans.vectors;

    const index = d.indexOf(math.min(d));
    const dir = new Vector(-v_2d[1][index], v_2d[0][index]);

    return {
        loc: cen_pt,
        dir: dir,
        err: LSFIT__get_ls_line_error(copied_pts, cen_pt, dir)
    };
}

/**
 * error of fit
 * @param pts
 * @param loc
 * @param dir
 * @constructor
 */
function LSFIT__get_ls_line_error(pts: Array<Vector>, loc: Vector, dir: Vector) {
    let sum_error = 0, max_error = 0;
    for (let pt of pts) {
        const dis = Math.abs(dir.y * pt.x - dir.x * pt.y);
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
