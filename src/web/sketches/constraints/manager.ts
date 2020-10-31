import Sketcher from "@/web/sketches/sketcher";
import Constraint from "@/web/sketches/constraints/constraint";
import SketchObject from "@/web/sketches/shapes/object";
import EndPoint from "@/web/sketches/shapes/point";
import {COINCIDENT, ConstraintDefinitions, PTONCIRCLE, PTONLINE} from "@/web/sketches/constraints/schema";
import StateStream from "@/web/stream/state";
import SolverSpace from "@/web/sketches/constraints/solverspace";
import Emitter from "@/web/stream/emitter";
import {SM_alloc} from "@/web/managers/om";
import Segment from "@/web/sketches/shapes/segment";
import {AddConstraintCommand, RemoveConstraintCommand} from "@/web/sketches/commands/constraint";
import Circle from "@/web/sketches/shapes/circle";
import PtOnCurveObject from "@/web/sketches/constraints/shapes/ptoncurve";
import System from "@/web/sketches/constraints/system";


export default class ConstraintManager {

    private readonly viewer: Sketcher;
    private readonly $spaces: StateStream;

    private inTransaction: boolean;
    private solveLocked: boolean;

    constructor(viewer: Sketcher) {
        this.viewer = viewer;

        this.$spaces = new StateStream({
            list: [],
            pointer: -1
        });
        this.$spaces.attach(() => this.viewer.refresh());

        this.inTransaction = false;
        this.solveLocked = false;

        this.reset();
    }

    get spaces() {
        return this.$spaces.value.list;
    }

    get isLocked() {
        return this.solveLocked;
    }

    startTransaction() {
        this.inTransaction = true;
        for (const space of this.spaces) {
            space.startTransaction();
        }
    }

    finishTransaction() {
        this.inTransaction = false;
        for (const space of this.spaces) {
            space.finishTransaction();
        }
        this.refresh();
    }

    reset() {
        this.$spaces.next({
            list: [new SolverSpace(this.viewer)],
            pointer: 0
        });
    }

    refresh() {
        if (this.inTransaction) return;
        this.prepare(null);
        this.viewer.refresh();
    }

    clear() {
        for (const space of this.spaces) {
            space.clear();
        }
    }

    /**
     * Add the constraint
     * @param constr
     */
    private _add(constr: Constraint) {
        const currentSpace: SolverSpace = this.spaces[0];
        currentSpace.addConstraint(SM_alloc(constr));
        if (constr.shape !== undefined) {
            this.viewer.constraintLayer.addAndAllocate(constr.shape);
        }
    }

    private _remove(constr: Constraint) {
        if (constr.space !== null) {
            constr.space.removeConstraint(constr);
        }
    }

    /**
     * remove objects, which will be created during preview
     * @param objects
     */
    removeObjects(objects: Array<SketchObject>) {
        this.startTransaction();
        this._removeObjects(objects);
        this.finishTransaction();
    }

    private _removeObjects(objects: Array<SketchObject>, force = false) {
        objects.forEach(obj => {
            if (obj.isRoot) {
                this._removeObject(obj, force);
            }
        })
    }

    /**
     * remove object and its corresponding constraints
     * @param obj
     * @param force
     * @private
     */
    private _removeObject(obj: SketchObject, force: boolean) {
        if (obj.disposed) return;
        obj.disposed = true;

        // remove the constraints of obj and its children
        obj.traverse((o: SketchObject) =>
            o.constraints.forEach((constraint) => {
                this._remove(constraint);
            }));

        obj.constraints.clear();
    }

    /**
     * Add a constraint
     * @param pt1
     * @param pt2
     */
    coincidePoints(pt1: EndPoint, pt2: EndPoint) {
        this._add(new Constraint(ConstraintDefinitions.get(COINCIDENT)!, [pt1, pt2]));
    }

    pointOnLine(pt: EndPoint, line: Segment) {
        const constraint = new Constraint(ConstraintDefinitions.get(PTONLINE)!, [pt, line]);
        constraint.addShape(new PtOnCurveObject(constraint, pt));
        this._add(constraint);
    }

    pointOnCircle(pt: EndPoint, circle: Circle) {
        const constraint = new Constraint(ConstraintDefinitions.get(PTONCIRCLE)!, [pt, circle]);
        constraint.addShape(new PtOnCurveObject(constraint, pt));
        this._add(constraint);
    }

    /**
     * main function to solve the constraints
     * @param rough
     */
    solve(rough: boolean) {
        if (this.solveLocked) return;

        for (const space of this.spaces) {
            const ans = space.solve(rough);
            if (ans.status !== System.SOLVED_OKAY) {
                this.solveLocked = true;
                this.viewer.streams.constraints.$message.next({
                    type: 'error',
                    message: 'solve constraint fails, try to remove at least one constraint and try again'
                });
            }
        }
        this.viewer.refresh();
    }

    /**
     * prepare before the solve
     * @param object
     * @param force
     */
    prepare(object: SketchObject | null, force: boolean = false) {
        for (const space of this.spaces) {
            space.prepare(object, force);
        }
    }

    solveFine() {
        if (this.solveLocked) {
            this.solveLocked = false;
            this.prepare(null);
            this.solve(false);
        }
    }

    addConstraintByCommand(constraints: Array<Constraint>) {
        this.viewer.execute(new AddConstraintCommand(this.viewer, constraints));
    }

    removeConstraintsByCommand(constraints: Array<Constraint>) {
        this.viewer.execute(new RemoveConstraintCommand(this.viewer, constraints));
    }

    addConstraints(constraints: Array<Constraint>) {
        constraints.forEach((constraint) => {
            this._add(constraint);
        });
        this.refresh();
    }

    removeConstraints(constraints: Array<Constraint>) {
        constraints.forEach((constraint) => {
            this._remove(constraint);
        });
        this.solveFine();
        this.refresh();
    }

    getSpace(index: number) {
        return this.spaces[index];
    }

    getSpaceIndex(space: SolverSpace) {
        return this.spaces.indexOf(space);
    }
}

export interface ISketchConstraintStream {
    $message: Emitter
}
