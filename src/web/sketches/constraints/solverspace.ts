import Sketcher from "@/web/sketches/sketcher";
import Constraint from "@/web/sketches/constraints/constraint";
import Param from "@/web/sketches/expressions/params";
import {Equation} from "@/web/sketches/expressions/exprs";
import SketchObject from "@/web/sketches/shapes/object";
import System from "@/web/sketches/constraints/system";
import IdList from '@/web/utils/list';
import {SM_free} from "@/web/managers/om";
import {syslog} from "@/web/syslog";
import {ERROR_ADD_CONSTRAINT} from "@/web/errors";


export default class SolverSpace {

    private viewer: Sketcher;

    private dof: number;

    private inTransaction: boolean;

    private constraints: Array<Constraint>;
    private conflictConstraints: Set<Constraint>;
    private snapshot: Map<Param, number>;

    public params: IdList<Param>;
    private equations: IdList<Equation>;

    public interactiveParams: Set<Param>;
    private draggedObject: SketchObject | null;

    private system: System;

    constructor(viewer: Sketcher) {
        this.viewer = viewer;

        this.dof = 1024;
        this.inTransaction = false;

        this.constraints = [];
        this.conflictConstraints = new Set();
        this.snapshot = new Map();

        this.params = new IdList();
        this.equations = new IdList();

        this.interactiveParams = new Set();
        this.draggedObject = null;

        this.system = new System();
    }

    get constraintEntries() {
        return this.constraints;
    }

    get index() {
        return this.viewer.constraintManager.getSpaceIndex(this);
    }

    startTransaction() {
        this.inTransaction = true;
    }

    finishTransaction() {
        this.inTransaction = false;
        this.prepare(null);
    }

    /**
     * add the constraint to the sub system
     * @param constraint
     */
    addConstraint(constraint: Constraint) {
        constraint.space = this;

        if (this.inTransaction) {
            this._addConstraintToObject(constraint);
            this.constraints.push(constraint);
            return;
        }

        this.constraints.push(constraint);

        this.prepare(null);
        if (!this.isConflicting(constraint)) {
            const ans = this.solve(false);
            if (ans.status !== System.SOLVED_OKAY) {
                this.conflictConstraints.add(constraint);
            }
        }

        if (this.isConflicting(constraint)) {
            // delete the constraint
            this.removeConstraint(constraint);
            this.evaluateAndBuildSolver();
            syslog.raise_error('add constraint fails', ERROR_ADD_CONSTRAINT, constraint.info);
        } else {
            this._addConstraintToObject(constraint);
        }
    }

    /**
     * add the constraint to the object and its children
     * @param constraint
     * @private
     */
    _addConstraintToObject(constraint: Constraint) {
        constraint.objects.forEach((object) => {
            object.traverse((item: SketchObject) => {
                item.constraints.add(constraint);
            })
        });
    }

    /**
     * use snap shot to rollback if necessary
     */
    makeSnapshot() {
        this.snapshot.clear();
        this.validConstraints(c => c.params.forEach(p => this.snapshot.set(p, p.get())));
    }

    rollback() {
        this.snapshot.forEach((val, param) => param.set(val));
    }

    isConflicting(constraint: Constraint) {
        return this.conflictConstraints.has(constraint);
    }

    /**
     * remove a constraint
     * @param constraint
     */
    removeConstraint(constraint: Constraint) {
        constraint.space = null;
        this._removeConstraint(constraint);
    }

    private _removeConstraint(constraint: Constraint) {
        let index = this.constraints.indexOf(constraint);
        if (index !== -1) {
            this.constraints.splice(index, 1);
            this.conflictConstraints.delete(constraint);
            // remove constraint from its objects
            constraint.objects.forEach(o => {
                o.constraints.delete(constraint);
            });
            constraint.removeShape(this.viewer.constraintLayer);
            SM_free(constraint);
        }
    }

    clear() {
        let num = this.constraints.length;
        while (num > 0) {
            const constraint = this.constraints[num - 1];
            this.removeConstraint(constraint);
            num = this.constraints.length;
        }
        this.reset();
    }

    /**
     * ignore the conflicting constraints
     * @param callback
     */
    private validConstraints(callback: (c: Constraint) => void) {
        this.constraints.forEach(c => {
            if (!this.conflictConstraints.has(c)) {
                callback(c);
            }
        })
    }

    /**
     * prepared for the solver
     * @param object
     * @param force
     */
    private prepare(object: SketchObject | null, force: boolean = false) {
        if (object !== null && !force && this.draggedObject === object) {
            return;
        }
        // sort the constraint by their id
        this.constraints.sort((a, b) => a.type - b.type);

        this.reset();
        // record the object activated in drag
        if (object !== null) {
            this.draggedObject = object;
            object.visitParams((p: Param) => this.interactiveParams.add(p));
        }

        // build the solver
        this.evaluateAndBuildSolver();
    }

    reset() {
        this.params.clear();
        this.interactiveParams.clear();
    }

    /**
     * evaluate the polynomials and build the solver
     */
    private evaluateAndBuildSolver() {
        this.viewer.activeLayer.objects.forEach((item) => {
            const object = item as SketchObject;
            object.visitParams((param: Param) => {
                if (!this.params.has(param)) {
                    this.params.addAndAssignId(param);
                }
            })
        });

        this.equations.clear();
        this.evaluateEquations();

        // load parameters to the system
        this.system.prepare(this.equations, Array.from(this.interactiveParams));
    }

    /**
     * evaluate polynomials
     */
    private evaluateEquations() {
        this.validConstraints(constraint => {
            constraint.collectEquations(this.equations);
        });
    }

    /**
     * solution
     * @param rough
     */
    solve(rough: boolean) {
        let status = System.SOLVED_OKAY;
        try {
            this.makeSnapshot();
            const ans = this.system.solve();
            this.dof = ans.dof;
        } catch (e) {
            this.rollback();
            status = e.status;
        }

        return {
            status: status
        }
    }
}
