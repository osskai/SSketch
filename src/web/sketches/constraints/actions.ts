import Sketcher from "@/web/sketches/sketcher";
import SketchObject, {CIRCLE, ENDPOINT, SEGMENT} from "@/web/sketches/shapes/object";
import {
    COINCIDENT,
    ConstraintDefinitions, EQUALLENGTH,
    EQUALRADIUS,
    HORIZONTAL,
    PARALLEL, PERPENDICULAR, PTONCIRCLE, PTONLINE, SYMMETRIC, TANGENT,
    VERTICAL
} from "@/web/sketches/constraints/schema";
import Constraint from "@/web/sketches/constraints/constraint";
import Segment from '../shapes/segment';
import {computePolygonArea} from '@/web/math/polygons';
import ParallelObject from "@/web/sketches/constraints/shapes/parallel";
import VerticalObject from "@/web/sketches/constraints/shapes/vertical";
import HorizontalObject from "@/web/sketches/constraints/shapes/horizontal";
import EqualsObject from "@/web/sketches/constraints/shapes/equals";
import PerpendicularObject from "@/web/sketches/constraints/shapes/perpendicular";
import PtOnCurveObject from "@/web/sketches/constraints/shapes/ptoncurve";
import SymmetricObject from "@/web/sketches/constraints/shapes/symmetric";


export interface IConstraintMatcherSequence {
    order: number,
    types: Array<string>;
    quantity: number;
}


export interface IConstraintMatcher {
    selector: string;
    types?: Array<string>;
    minQuantity?: number;
    sequence?: Array<IConstraintMatcherSequence>
}

export interface IConstraintAction {
    id: number;
    name: string;
    selectionMatcher: IConstraintMatcher;
    invoke: (viewer: Sketcher, matchedSelections: Array<SketchObject>) => Array<Constraint>
}

export const ConstraintActions = new Map<number, IConstraintAction>();

ConstraintActions.set(COINCIDENT, {
    id: COINCIDENT,
    name: 'Coincident',
    selectionMatcher: {
        selector: 'matchAll',
        types: [ENDPOINT],
        minQuantity: 2
    },
    invoke: (viewer, matchedSelections) => {
        const [first, ...others] = matchedSelections;

        let constraints: Array<Constraint> = [];
        for (let obj of others) {
            constraints.push(
                new Constraint(ConstraintDefinitions.get(COINCIDENT)!, [first, obj])
            );
        }
        return constraints;
    }
});

ConstraintActions.set(HORIZONTAL, {
    id: HORIZONTAL,
    name: 'Horizontal',
    selectionMatcher: {
        selector: 'matchAll',
        types: [SEGMENT],
        minQuantity: 1
    },
    invoke: (viewer, matchedSelections) => {
        let constraints: Array<Constraint> = [];
        matchedSelections.forEach(obj => {
            const constr = new Constraint(ConstraintDefinitions.get(HORIZONTAL)!, [obj]);
            constr.addShape(new HorizontalObject(constr, constr.objects));
            constraints.push(constr);
        });
        return constraints;
    }
});

ConstraintActions.set(VERTICAL, {
    id: VERTICAL,
    name: 'Vertical',
    selectionMatcher: {
        selector: 'matchAll',
        types: [SEGMENT],
        minQuantity: 1
    },
    invoke: (viewer, matchedSelections) => {
        let constraints: Array<Constraint> = [];
        matchedSelections.forEach(obj => {
            const constr = new Constraint(ConstraintDefinitions.get(VERTICAL)!, [obj]);
            constr.addShape(new VerticalObject(constr, constr.objects));
            constraints.push(constr);
        });
        return constraints;
    }
});

ConstraintActions.set(PARALLEL, {
    id: PARALLEL,
    name: 'Parallel',
    selectionMatcher: {
        selector: 'matchAll',
        types: [SEGMENT],
        minQuantity: 2
    },
    invoke: (viewer, matchedSelections) => {
        let constraints: Array<Constraint> = [];
        for (let i = 1; i < matchedSelections.length; ++i) {
            const constr = new Constraint(ConstraintDefinitions.get(PARALLEL)!,
                [matchedSelections[i - 1], matchedSelections[i]]);
            constr.addShape(new ParallelObject(constr, constr.objects));
            constraints.push(constr);
        }
        return constraints;
    }
});

ConstraintActions.set(EQUALRADIUS, {
    id: EQUALRADIUS,
    name: 'Equal Radius',
    selectionMatcher: {
        selector: 'matchAll',
        types: [CIRCLE],
        minQuantity: 2
    },
    invoke: (viewer, matchedSelections) => {
        const [first, ...others] = matchedSelections;

        let constraints: Array<Constraint> = [];
        for (let obj of others) {
            const constr = new Constraint(ConstraintDefinitions.get(EQUALRADIUS)!, [first, obj])
            constr.addShape(new EqualsObject(constr, constr.objects));
            constraints.push(constr);
        }
        return constraints;
    }
});

ConstraintActions.set(TANGENT, {
    id: TANGENT,
    name: 'Tangent',
    selectionMatcher: {
        selector: 'matchSequence',
        sequence: [{
            order: 0,
            types: [SEGMENT],
            quantity: 1
        }, {
            order: 1,
            types: [CIRCLE],
            quantity: 1
        }]
    },
    invoke: (viewer, matchedSelections) => {
        const constraint = new Constraint(ConstraintDefinitions.get(TANGENT)!,
            matchedSelections);
        return [constraint];
    }
});

ConstraintActions.set(PERPENDICULAR, {
    id: PERPENDICULAR,
    name: 'Perpendicular',
    selectionMatcher: {
        selector: 'matchAll',
        types: [SEGMENT],
        minQuantity: 2
    },
    invoke: (viewer, matchedSelections) => {
        let constraints: Array<Constraint> = [];
        for (let i = 1; i < matchedSelections.length; ++i) {
            const constr = new Constraint(ConstraintDefinitions.get(PERPENDICULAR)!,
                [matchedSelections[i - 1], matchedSelections[i]]);
            constr.addShape(new PerpendicularObject(constr, constr.objects));
            constraints.push(constr);
        }
        return constraints;
    }
});

ConstraintActions.set(EQUALLENGTH, {
    id: EQUALLENGTH,
    name: 'Equal Length',
    selectionMatcher: {
        selector: 'matchAll',
        types: [SEGMENT],
        minQuantity: 2
    },
    invoke: (viewer, matchedSelections) => {
        const [first, ...others] = matchedSelections;

        let constraints: Array<Constraint> = [];
        for (let obj of others) {
            const constr = new Constraint(ConstraintDefinitions.get(EQUALLENGTH)!, [first, obj]);
            constr.addShape(new EqualsObject(constr, constr.objects));
            constraints.push(constr);
        }
        return constraints;
    }
});

ConstraintActions.set(SYMMETRIC, {
    id: SYMMETRIC,
    name: 'Symmetric',
    selectionMatcher: {
        selector: 'matchSequence',
        sequence: [{
            order: 0,
            types: [ENDPOINT, SEGMENT],
            quantity: 2
        }, {
            order: 1,
            types: [SEGMENT],
            quantity: 1
        }]
    },
    invoke: (viewer, matchedSelections) => {
        let constraints = [];
        // it must be both have the same class
        if (matchedSelections[0].class === SEGMENT) {
            const seg1 = matchedSelections[0] as Segment;
            const seg2 = matchedSelections[1] as Segment;
            // if the seg1 and seg2 have different orientations
            const maybePoints = [seg1.a.toVector(), seg1.b.toVector(), seg2.a.toVector(), seg2.b.toVector()];
            const desiredPoints = [seg1.a.toVector(), seg1.b.toVector(), seg2.b.toVector(), seg2.a.toVector()];
            if (computePolygonArea(desiredPoints) > computePolygonArea(maybePoints)) {
                const constr1 = new Constraint(ConstraintDefinitions.get(SYMMETRIC)!, [seg1.a, seg2.a, matchedSelections[2]]);
                constr1.addShape(new SymmetricObject(constr1, constr1.objects));
                const constr2 = new Constraint(ConstraintDefinitions.get(SYMMETRIC)!, [seg1.b, seg2.b, matchedSelections[2]]);
                constr2.addShape(new SymmetricObject(constr2, constr2.objects));
                constraints.push(constr1, constr2);
            } else {
                const constr1 = new Constraint(ConstraintDefinitions.get(SYMMETRIC)!, [seg1.a, seg2.b, matchedSelections[2]]);
                constr1.addShape(new SymmetricObject(constr1, constr1.objects));
                const constr2 = new Constraint(ConstraintDefinitions.get(SYMMETRIC)!, [seg1.b, seg2.a, matchedSelections[2]]);
                constr2.addShape(new SymmetricObject(constr2, constr2.objects));
                constraints.push(constr1, constr2);
            }
        } else {
            const constraint = new Constraint(ConstraintDefinitions.get(SYMMETRIC)!, matchedSelections);
            constraint.addShape(new SymmetricObject(constraint, constraint.objects));
            constraints.push(constraint);
        }
        return constraints;
    }
});

ConstraintActions.set(PTONLINE, {
    id: PTONLINE,
    name: 'Point on line',
    selectionMatcher: {
        selector: 'matchSequence',
        sequence: [{
            order: 0,
            types: [ENDPOINT],
            quantity: 1
        }, {
            order: 1,
            types: [SEGMENT],
            quantity: 1
        }]
    },
    invoke: (viewer, matchedSelections) => {
        const constraint = new Constraint(ConstraintDefinitions.get(PTONLINE)!,
            matchedSelections);
        constraint.addShape(new PtOnCurveObject(constraint, matchedSelections[0]));
        return [constraint];
    }
});

ConstraintActions.set(PTONCIRCLE, {
    id: PTONCIRCLE,
    name: 'Point on circle',
    selectionMatcher: {
        selector: 'matchSequence',
        sequence: [{
            order: 0,
            types: [ENDPOINT],
            quantity: 1
        }, {
            order: 1,
            types: [CIRCLE],
            quantity: 1
        }]
    },
    invoke: (viewer, matchedSelections) => {
        const constraint = new Constraint(ConstraintDefinitions.get(PTONCIRCLE)!,
            matchedSelections);
        constraint.addShape(new PtOnCurveObject(constraint, matchedSelections[0]));
        return [constraint];
    }
});


