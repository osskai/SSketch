import Param from "@/web/sketches/expressions/params";
import {Equation, Expr} from "@/web/sketches/expressions/exprs";
import IdList from '@/web/utils/list';
import {syslog} from "@/web/syslog";
import {ERROR_SOLVER} from "@/web/errors";

const math = require('mathjs');

export const MAX_UNKNOWNS = 1024;

class JacobianA {

    public sym: Array<Array<Expr>>;
    public num: Array<Array<number>> = [];

    constructor() {
        this.sym = [];
    }
}

class JacobianB {

    public sym: Array<Expr>;
    public num: Array<number> = [];

    constructor() {
        this.sym = [];
    }
}


class JacobianMatrix {

    public m: number;
    public n: number;

    public param: Array<number>;
    public equations: Array<number>;

    public A: JacobianA;
    public B: JacobianB;
    public X: Array<number> = [];

    public AAt: Array<Array<number>> = [];
    public Z: Array<number> = [];

    public scale: Array<number> = [];

    constructor() {
        this.m = MAX_UNKNOWNS;
        this.n = MAX_UNKNOWNS;

        this.param = [];
        this.equations = [];

        this.A = new JacobianA();
        this.B = new JacobianB();
    }

    init(m: number, n: number) {
        this.A.num = math.zeros(m, n).toArray();
        this.B.num = math.zeros(m).toArray();
        this.AAt = math.zeros(m, m).toArray();
        this.Z = math.zeros(n).toArray();
        this.X = math.zeros(n).toArray();
        this.scale = math.zeros(m).toArray();
    }

    reset() {
        this.param = [];
        this.equations = [];
        this.A.sym = [];
        this.B.sym = [];
    }
}


export default class System {

    static VAR_SUBSTITUTED = 10001;
    static EQ_SUBSTITUTED = 20000;

    static SOLVED_OKAY = 0;
    static SINGULAR_JACOBIAN = 1;
    static DIDNT_CONVERGE = 2;
    static TOO_MANY_UNKNOWNS = 3;

    // equations and params are prepared to be solved
    public equations: IdList<Equation>;
    public params: IdList<Param>;

    private dragged: IdList<Param>;
    private substituteGraph: { eqs: Array<Equation>, data: Map<number, Array<number>> };

    private mat: JacobianMatrix;

    constructor() {
        this.equations = new IdList();
        this.params = new IdList();

        this.dragged = new IdList();
        this.substituteGraph = {eqs: [], data: new Map()};

        this.mat = new JacobianMatrix();
    }

    prepare(equations: IdList<Equation>, interactiveParam: Array<Param>) {
        this.equations = equations;

        const candidateParams: Array<Param> = [];
        equations.elem.forEach((equation) => {
            equation.visitParams((param: Param) => candidateParams.push(param));
        });

        // push the valid params
        this.params.clear();
        candidateParams.forEach((param) => {
            if (!this.params.has(param)) {
                this.params.add(param);
            }
        });

        this.dragged.clear();
        interactiveParam.forEach((param) => {
            this.dragged.add(param);
        });

        // init the substitution
        this.substituteInit();
    }

    private preProcess() {
        // Before solving the big system, see if we can find any equations that
        // are soluble alone. This can be a huge speedup. We don't know whether
        // the system is consistent yet, but if it isn't then we'll catch that
        // later.
        let alone = 1;
        for (let i = 0; i < this.equations.n; i++) {
            let eq = this.equations.elem[i];
            if (eq.tag !== 0) continue;

            const refId = eq.expr.referencedParams(this.params);
            if (refId === Expr.NO_PARAMS || refId === Expr.MULTIPLE_PARAMS) continue;

            const p = this.params.findById(refId) as Param;
            if (p.tag !== 0) continue; // let rank test catch inconsistency

            eq.tag = alone;
            p.tag = alone;
            this.writeJacobian(alone);
            if (!this.newtonSolve()) {
                // Failed to converge, bail out early
                return {
                    status: System.DIDNT_CONVERGE
                };
            }
            ++alone;
        }
    }

    private postProcess() {
        // System solved correctly, so write the new values back in to the
        // main parameter table.
        for (let i = 0; i < this.params.n; ++i) {
            const param = this.params.elem[i];
            if (param.tag === System.VAR_SUBSTITUTED) {
                const val = this.params.findById(param.substd)!.get();
                param.set(val);
                param.know = true;
            }
        }
    }

    solve() {
        // clear the tag of params and equations
        this.params.clearTags();
        this.params.elem.forEach((param) => {
            param.solverInit();
        });
        this.equations.clearTags();

        // 1. check special cases
        this.substitute();

        // 2. preprocess
        this.preProcess();

        // 3. big solve
        if (!this.writeJacobian(0)) {
            syslog.raise_error('generate jacobian matrix fails', {
                status: System.TOO_MANY_UNKNOWNS
            }, this.mat.A);
        }
        this.evalJacobian();

        const rank = this.calculateRank();
        if (rank !== this.mat.m) {
            syslog.raise_error('jacobian matrix is singular', {
                status: System.SINGULAR_JACOBIAN
            }, [rank, this.mat.m]);
        }

        const dof = this.mat.n - this.mat.m;
        if (!this.newtonSolve()) {
            syslog.raise_error('jacobian matrix is not converge', {
                status: System.DIDNT_CONVERGE
            }, this.mat.B.num);
        }

        // 4. post process
        this.postProcess();

        return {
            status: System.SOLVED_OKAY,
            dof: dof
        };
    }

    private writeJacobian(tag: number) {
        // reset the matrix firstly.
        this.mat.reset();

        let column = 0;
        for (let i = 0; i < this.params.n; ++i) {
            if (column >= MAX_UNKNOWNS) return false;

            const p = this.params.elem[i];
            if (p.tag !== tag) continue;

            this.mat.param.push(p.id);
            ++column;
        }
        this.mat.n = column;

        let row = 0;
        for (let i = 0; i < this.equations.n; ++i) {
            if (row >= MAX_UNKNOWNS) return false;

            const equation = this.equations.elem[i];
            if (equation.tag !== tag) continue;

            this.mat.equations.push(equation.id);

            let f = equation.expr.deepCopy(this.params);
            const isParamUsed = f.paramUsed();

            let columnA = new Array<Expr>(this.mat.n);
            for (let i = 0; i < this.mat.n; ++i) {
                const param = this.params.findById(this.mat.param[i]) as Param;
                if (isParamUsed && f.dependsOn(param)) {
                    columnA[i] = f.derivative(param) as Expr;
                } else {
                    columnA[i] = Expr.fromValue(0);
                }
            }
            this.mat.A.sym.push(columnA);
            this.mat.B.sym.push(f);
            ++row;
        }
        this.mat.m = row;

        // updates the num of A, B, AAt, Z, X
        this.mat.init(this.mat.m, this.mat.n);

        return true;
    }

    private evalJacobian() {
        for (let i = 0; i < this.mat.m; ++i) {
            for (let j = 0; j < this.mat.n; ++j) {
                this.mat.A.num[i][j] = (this.mat.A.sym[i][j]).eval();
            }
        }
    }

    private isDragged(id: number): boolean {
        return this.dragged.findById(id) !== null;
    }

    /**
     * union-find algorithm
     */
    private substituteInit() {
        const substituteEqs: Array<Equation> = [];
        const pairs: Set<{ p: number, q: number }> = new Set();
        const ids: Set<number> = new Set();
        for (let i = 0; i < this.equations.n; ++i) {
            const teq = this.equations.elem[i];
            const tex = teq.expr;

            if (tex.op === Expr.MINUS && tex.a!.op === Expr.PARAM && tex.b!.op === Expr.PARAM) {
                let ia = tex.a!.param.id;
                let ib = tex.b!.param.id;
                if (ia > ib) {
                    [ia, ib] = [ib, ia];
                }

                const pair = {p: ia, q: ib};
                if (pairs.has(pair)) {
                    syslog.raise_error('redundant constraint', ERROR_SOLVER);
                }
                pairs.add(pair);

                if (!ids.has(ia)) ids.add(ia);
                if (!ids.has(ib)) ids.add(ib);

                substituteEqs.push(teq);
            }
        }

        const idMap: Map<number, number> = new Map();
        const idSizeMap: Map<number, number> = new Map();
        for (const id of ids) {
            idMap.set(id, id);
            idSizeMap.set(id, 1);
        }

        function find(p: number) {
            while (p !== idMap.get(p)) {
                idMap.set(p, idMap.get(idMap.get(p)!)!);
                p = idMap.get(p)!;
            }

            return p;
        }

        function union(p: number, q: number) {
            const pc = find(p);
            const qc = find(q);
            if (pc === qc) {
                return;
            }
            if (idSizeMap.get(pc)! > idSizeMap.get(qc)!) {
                idMap.set(qc, pc);
                idSizeMap.set(pc, idSizeMap.get(pc)! + 1);
            } else {
                idMap.set(pc, qc);
                idSizeMap.set(qc, idSizeMap.get(qc)! + 1);
            }
        }

        pairs.forEach((pair) => {
            union(pair.p, pair.q);
        });

        const graph: Map<number, Array<number>> = new Map();
        for (const id of ids) {
            const root = find(id);
            let group = graph.get(root);
            if (group === undefined) {
                group = new Array<number>();
            }
            group.push(id);
            graph.set(root, group);
        }

        this.substituteGraph.eqs = substituteEqs;
        this.substituteGraph.data = graph;
    }


    /**
     * substitute, simplify the matrix
     */
    private substitute() {
        // 1. record the equations
        for (const teq of this.substituteGraph.eqs) {
            teq.tag = System.EQ_SUBSTITUTED;
        }

        // 2. record the params
        for (let [key, entries] of this.substituteGraph.data) {
            let activeId = key;
            if (!this.isDragged(activeId)) {
                entries.sort();

                activeId = -1;
                for (const item of entries) {
                    if (this.isDragged(item)) {
                        activeId = item;
                        break;
                    }
                }
                if (activeId !== -1) {
                    this.substituteGraph.data.set(activeId, entries);
                    this.substituteGraph.data.delete(key);
                } else {
                    activeId = key;
                }
            }

            for (const item of entries) {
                if (item === activeId) continue;
                let ptr = this.params.findById(item) as Param;
                ptr.tag = System.VAR_SUBSTITUTED;
                ptr.substd = activeId;
            }
        }
    }

    private solveLeastSquares() {
        // Scale the columns; this scale weights the parameters for the least
        // squares solve, so that we can encourage the solver to make bigger
        // changes in some parameters, and smaller in others.
        for (let c = 0; c < this.mat.n; c++) {
            const param = this.params.findById(this.mat.param[c]) as Param;
            if (this.isDragged(param.id)) {
                // It's least squares, so this parameter doesn't need to be all
                // that big to get a large effect.
                this.mat.scale[c] = 1 / 20.0;
            } else {
                this.mat.scale[c] = 1;
            }
            for (let r = 0; r < this.mat.m; r++) {
                this.mat.A.num[r][c] *= this.mat.scale[c];
            }
        }

        // Write A*A'
        for (let r = 0; r < this.mat.m; r++) {
            for (let c = 0; c < this.mat.m; c++) {  // yes, AAt is square
                let sum = 0;
                for (let i = 0; i < this.mat.n; i++) {
                    sum += this.mat.A.num[r][i] * this.mat.A.num[c][i];
                }
                this.mat.AAt[r][c] = sum;
            }
        }

        // solve the matrix
        if (!System.solveLinearSystem(this.mat.AAt, this.mat.B.num, this.mat.Z, this.mat.m)) return false;

        // And multiply that by A' to get our solution.
        for (let c = 0; c < this.mat.n; c++) {
            let sum = 0;
            for (let i = 0; i < this.mat.m; i++) {
                sum += this.mat.A.num[i][c] * this.mat.Z[i];
            }
            this.mat.X[c] = sum * this.mat.scale[c];
        }
        return true;
    }

    private static solveLinearSystem(A: Array<Array<number>>, B: Array<number>, X: Array<number>, n: number) {
        // Gaussian elimination, with partial pivoting. It's an error if the
        // matrix is singular, because that means two constraints are
        // equivalent.
        for (let i = 0; i < n; i++) {
            // We are trying eliminate the term in column i, for rows i+1 and
            // greater. First, find a pivot (between rows i and N-1).
            let max = 0, imax = 0;
            for (let ip = i; ip < n; ip++) {
                if (math.larger(A[ip][i], max)) {
                    imax = ip;
                    max = math.abs(A[ip][i]);
                }
            }
            // Don't give up on a singular matrix unless it's really bad; the
            // assumption code is responsible for identifying that condition,
            // so we're not responsible for reporting that error.
            if (math.smaller(max, 1e-20)) return false;

            // Swap row imax with row i
            for (let jp = 0; jp < n; jp++) {
                [A[imax][jp], A[i][jp]] = [A[i][jp], A[imax][jp]];
            }
            [B[imax], B[i]] = [B[i], B[imax]];

            // For rows i+1 and greater, eliminate the term in column i.
            for (let ip = i + 1; ip < n; ip++) {
                const temp = A[ip][i] / A[i][i];

                for (let jp = i; jp < n; jp++) {
                    A[ip][jp] -= temp * (A[i][jp]);
                }
                B[ip] -= temp * B[i];
            }
        }

        // We've put the matrix in upper triangular form, so at this point we
        // can solve by back-substitution.
        for (let i = n - 1; i >= 0; i--) {
            if (math.smaller(A[i][i], 1e-20)) return false;

            let temp = B[i];
            for (let j = n - 1; j > i; j--) {
                temp -= X[j] * A[i][j];
            }
            X[i] = temp / A[i][i];
        }

        return true;
    }

    private newtonSolve() {
        if (this.mat.m > this.mat.n) return false;

        let convergent = false;
        // Evaluate the functions at our operating point.
        for (let i = 0; i < this.mat.m; i++) {
            this.mat.B.num[i] = (this.mat.B.sym[i]).eval();
        }

        let iter = 0;
        do {
            // And evaluate the Jacobian at our initial operating point.
            this.evalJacobian();

            if (!this.solveLeastSquares()) break;

            // Take the Newton step;
            //      J(x_n) (x_{n+1} - x_n) = 0 - F(x_n)
            for (let i = 0; i < this.mat.n; i++) {
                let param = this.params.findById(this.mat.param[i]) as Param;
                param.set(param.get() - this.mat.X[i]);
                if (math.isNaN(param.get())) {
                    // Very bad, and clearly not convergent
                    return false;
                }
            }

            // Re-evaluate the functions, since the params have just changed.
            for (let i = 0; i < this.mat.m; i++) {
                this.mat.B.num[i] = (this.mat.B.sym[i]).eval();
            }
            // Check for convergence
            convergent = true;
            for (let i = 0; i < this.mat.m; i++) {
                if (math.isNaN(this.mat.B.num[i])) {
                    return false;
                }
                if (math.larger(this.mat.B.num[i], 1.e-8)) {
                    convergent = false;
                    break;
                }
            }
        } while (iter++ < 10 && !convergent);

        return convergent;
    }

    private calculateRank() {
        let rank = 0;
        // Actually work with magnitudes squared, not the magnitudes
        let rowMag = math.zeros(MAX_UNKNOWNS).toArray();
        for (let i = 0; i < this.mat.m; i++) {
            // Subtract off this row's component in the direction of any
            // previous rows
            for (let iprev = 0; iprev < i; iprev++) {
                if (rowMag[iprev] <= 1.e-12) continue; // ignore zero rows

                let dot = 0;
                for (let j = 0; j < this.mat.n; j++) {
                    dot += (this.mat.A.num[iprev][j]) * (this.mat.A.num[i][j]);
                }
                for (let j = 0; j < this.mat.n; j++) {
                    this.mat.A.num[i][j] -= (dot / rowMag[iprev]) * this.mat.A.num[iprev][j];
                }
            }
            // Our row is now normal to all previous rows; calculate the
            // magnitude of what's left
            let mag = 0;
            for (let j = 0; j < this.mat.n; j++) {
                mag += (this.mat.A.num[i][j]) * (this.mat.A.num[i][j]);
            }
            if (mag > 1.e-12) {
                rank++;
            }
            rowMag[i] = mag;
        }

        return rank;
    }
}
