import Param from "@/web/sketches/expressions/params";
import {Equation, Expr} from "@/web/sketches/expressions/exprs";
import SketchObject from '../shapes/object';
import {ExprVector} from "@/web/sketches/expressions/exprvector";
import IdList from "@/web/utils/list";


export interface IConstraintDefinition {
    id: number,
    name: string,
    collectParams: Function,
    collectEquations: Function
}

export const ConstraintDefinitions = new Map<number, IConstraintDefinition>();

export const COINCIDENT = 20;
ConstraintDefinitions.set(COINCIDENT, {
    id: COINCIDENT,
    name: 'Coincident',
    collectParams: ([p1, p2]: Array<SketchObject>, callback: Function) => {
        p1.visitParams(callback);
        p2.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x1, y1, x2, y2]: Array<Param>) => {
        const au = Expr.fromParam(x1);
        const av = Expr.fromParam(y1);

        const bu = Expr.fromParam(x2);
        const bv = Expr.fromParam(y2);

        equations.addAndAssignId(new Equation(au.minus(bu)));
        equations.addAndAssignId(new Equation(av.minus(bv)));
    }
});

export const HORIZONTAL = 80;
ConstraintDefinitions.set(HORIZONTAL, {
    id: HORIZONTAL,
    name: 'Horizontal',
    collectParams: ([segment]: Array<SketchObject>, callback: Function) => {
        segment.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x1, y1, x2, y2]: Array<Param>) => {
        const av = Expr.fromParam(y1);
        const bv = Expr.fromParam(y2);

        equations.addAndAssignId(new Equation(av.minus(bv)));
    }
});


export const VERTICAL = 81;
ConstraintDefinitions.set(VERTICAL, {
    id: VERTICAL,
    name: 'Vertical',
    collectParams: ([segment]: Array<SketchObject>, callback: Function) => {
        segment.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x1, y1, x2, y2]: Array<Param>) => {
        const au = Expr.fromParam(x1);
        const bu = Expr.fromParam(x2);

        equations.addAndAssignId(new Equation(au.minus(bu)));
    }
});

function direction(ax: Param, ay: Param, bx: Param, by: Param) {
    const a = ExprVector.fromParams(ax, ay);
    const b = ExprVector.fromParams(bx, by);

    return a.minus(b);
}

export const PARALLEL = 121;
ConstraintDefinitions.set(PARALLEL, {
    id: PARALLEL,
    name: 'Parallel',
    collectParams: ([from, to]: Array<SketchObject>, callback: Function) => {
        from.visitParams(callback);
        to.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x01, y01, x02, y02, x11, y11, x12, y12]: Array<Param>) => {
        const ae = direction(x01, y01, x02, y02);
        const be = direction(x11, y11, x12, y12);

        equations.addAndAssignId(new Equation(ae.cross(be)));
    }
});


export const EQUALRADIUS = 130;
ConstraintDefinitions.set(EQUALRADIUS, {
    id: EQUALRADIUS,
    name: 'Equal Radius',
    collectParams: ([from, to]: Array<SketchObject>, callback: Function) => {
        from.visitParams(callback);
        to.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x1, y1, r1, x2, y2, r2]: Array<Param>) => {
        const au = Expr.fromParam(r1);
        const bu = Expr.fromParam(r2);

        equations.addAndAssignId(new Equation(au.minus(bu)));
    }
});


export const TANGENT = 123;
ConstraintDefinitions.set(TANGENT, {
    id: TANGENT,
    name: 'Tangent',
    collectParams: ([line, circle]: Array<SketchObject>, callback: Function) => {
        line.visitParams(callback);
        circle.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x0, y0, x1, y1, xc, yc, r]: Array<Param>) => {
        const dis = point2LineDistance(xc, yc, x0, y0, x1, y1);
        const cr = Expr.fromParam(r);

        equations.addAndAssignId(new Equation(dis.minus(cr)));
    }
});

export const PERPENDICULAR = 122;
ConstraintDefinitions.set(PERPENDICULAR, {
    id: PERPENDICULAR,
    name: 'Perpendicular',
    collectParams: ([line1, line2]: Array<SketchObject>, callback: Function) => {
        line1.visitParams(callback);
        line2.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x01, y01, x02, y02, x11, y11, x12, y12]: Array<Param>) => {
        const ae = direction(x01, y01, x02, y02);
        const be = direction(x11, y11, x12, y12);

        equations.addAndAssignId(new Equation(ae.dot(be)));
    }
});

export const COLLINEAR = 124;
ConstraintDefinitions.set(COLLINEAR, {
    id: COLLINEAR,
    name: 'Collinear',
    collectParams: ([line1, line2]: Array<SketchObject>, callback: Function) => {
        line1.visitParams(callback);
        line2.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x01, y01, x02, y02, x11, y11, x12, y12]: Array<Param>) => {
        const a0 = ExprVector.fromParams(x01, y01);
        const a1 = ExprVector.fromParams(x02, y02);
        const ae = a0.minus(a1);

        const b0 = ExprVector.fromParams(x11, y11);
        const b1 = ExprVector.fromParams(x12, y12);
        const be = b0.minus(b1);

        equations.addAndAssignId(new Equation(ae.cross(be)));
    }
});

function distance(ax: Param, ay: Param, bx: Param, by: Param) {
    const au = Expr.fromParam(ax);
    const av = Expr.fromParam(ay);

    const bu = Expr.fromParam(bx);
    const bv = Expr.fromParam(by);

    const du = au.minus(bu);
    const dv = av.minus(bv);

    return du.square().plus(dv.square()).sqrt();
}

export const EQUALLENGTH = 50;
ConstraintDefinitions.set(EQUALLENGTH, {
    id: EQUALLENGTH,
    name: 'Equal Length',
    collectParams: ([line1, line2]: Array<SketchObject>, callback: Function) => {
        line1.visitParams(callback);
        line2.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [x01, y01, x02, y02, x11, y11, x12, y12]: Array<Param>) => {
        const d1 = distance(x01, y01, x02, y02);
        const d2 = distance(x11, y11, x12, y12);

        equations.addAndAssignId(new Equation(d1.minus(d2)));
    }
});

export const SYMMETRIC = 63;
ConstraintDefinitions.set(SYMMETRIC, {
    id: SYMMETRIC,
    name: 'Symmetric',
    collectParams: ([ptA, ptB, line2]: Array<SketchObject>, callback: Function) => {
        ptA.visitParams(callback);
        ptB.visitParams(callback);
        line2.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [ax, ay, bx, by, lax, lay, lbx, lby]: Array<Param>) => {
        const eab = direction(bx, by, ax, ay);
        const el = direction(lbx, lby, lax, lay);
        // The line through the points is perpendicular to the line
        // of symmetry.
        equations.addAndAssignId(new Equation(eab.dot(el)));

        // And the signed distances of the points to the line are
        // equal in magnitude and opposite in sign, so sum to zero
        const eala = direction(lax, lay, ax, ay);
        const ebla = direction(lax, lay, bx, by);

        equations.addAndAssignId(new Equation(eala.cross(el).plus(ebla.cross(el))));
    }
});

function point2LineDistance(px: Param, py: Param, lax: Param, lay: Param, lbx: Param, lby: Param) {
    const au = Expr.fromParam(lax);
    const av = Expr.fromParam(lay);

    const bu = Expr.fromParam(lbx);
    const bv = Expr.fromParam(lby);

    const du = au.minus(bu);
    const dv = av.minus(bv);

    const pu = Expr.fromParam(px);
    const pv = Expr.fromParam(py);

    const m = du.square().plus(dv.square()).sqrt();
    const proj = dv.times(au.minus(pu)).minus(du.times(av.minus(pv)));

    return proj.div(m);
}

export const PTONLINE = 42;
ConstraintDefinitions.set(PTONLINE, {
    id: PTONLINE,
    name: 'Point on line',
    collectParams: ([pt, line]: Array<SketchObject>, callback: Function) => {
        pt.visitParams(callback);
        line.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [px, py, lax, lay, lbx, lby]: Array<Param>) => {
        equations.addAndAssignId(new Equation(point2LineDistance(px, py, lax, lay, lbx, lby)));
    }
});

export const PTONCIRCLE = 100;
ConstraintDefinitions.set(PTONCIRCLE, {
    id: PTONCIRCLE,
    name: 'Point on circle',
    collectParams: ([pt, circle]: Array<SketchObject>, callback: Function) => {
        pt.visitParams(callback);
        circle.visitParams(callback);
    },
    collectEquations: (equations: IdList<Equation>, [px, py, cx, cy, r]: Array<Param>) => {
        const dis = distance(px, py, cx, cy);
        const cr = Expr.fromParam(r);

        equations.addAndAssignId(new Equation(dis.minus(cr)));
    }
});
