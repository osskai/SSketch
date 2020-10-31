import {ConstraintDefinitions, IConstraintDefinition} from "@/web/sketches/constraints/schema";
import SketchObject from "@/web/sketches/shapes/object";
import Param from "@/web/sketches/expressions/params";
import SolverSpace from "@/web/sketches/constraints/solverspace";
import IdList from "@/web/utils/list";
import {Equation} from "@/web/sketches/expressions/exprs";
import {IConstraintMatcher, IConstraintMatcherSequence} from "@/web/sketches/constraints/actions";
import TaggedObject, {SM_alloc} from "@/web/managers/om";
import {syslog} from "@/web/syslog";
import {ERROR_UNKNOWN} from "@/web/errors";
import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Layer from "@/web/sketches/layer";


export default class Constraint extends TaggedObject {

    public type: number;

    private readonly schema: IConstraintDefinition;
    readonly objects: Array<SketchObject>;
    private readonly _params: Array<Param>;

    public shape: ConstraintObject | undefined;

    public space: SolverSpace | null;

    constructor(schema: IConstraintDefinition, objects: Array<SketchObject>) {
        super();

        this.type = schema.id;
        this.schema = schema;
        this.objects = objects;

        this._params = [];
        this.schema.collectParams(this.objects, (p: Param) => this._params.push(p));

        this.space = null;
        this.__class = 'CONSTRAINT.' + schema.name.replace(' ', '');
    }

    get info() {
        let infos = [...super.info];
        this.objects.forEach((object) => {
            infos.push({'object': object.info});
        });

        return infos;
    }

    get savedInfo() {
        return {
            typeId: this.schema.id,
            objects: this.objects.map(o => o.nodeId),
            space: this.space && this.space.index,
        }
    }

    static read({typeId, objects, space}: any, index: any) {
        const schema = ConstraintDefinitions.get(typeId);
        if (!schema) {
            syslog.raise_error("constraint schema " + typeId + " doesn't exist", ERROR_UNKNOWN);
        }
        return SM_alloc(new Constraint(schema!, objects.map((oId: number) => index.get(oId))));
    }

    get params() {
        return this._params;
    }

    addShape(shape: ConstraintObject) {
        this.shape = shape;
    }

    removeShape(layer: Layer) {
        if (this.shape === undefined) return;

        layer.removeAndFree(this.shape);
    }

    static matchSelection(selectionMatcher: IConstraintMatcher, matchIndex: MatchIndex, fast: boolean) {
        const selection = matchIndex.selection;
        if (selectionMatcher.selector === 'matchAll') {
            const {minQuantity: min, types} = selectionMatcher;
            if (min !== undefined && selection.length < min) {
                return false;
            }
            for (let obj of selection) {
                let hit = false;
                for (let type of types!) {
                    if (type === obj.class) {
                        hit = true;
                        break;
                    }
                }
                if (!hit) {
                    return false;
                }
            }
            return fast ? true : selection;
        } else if (selectionMatcher.selector === 'matchSequence') {
            matchIndex.reset(fast, selectionMatcher.sequence!);
            for (let item of selectionMatcher.sequence!) {
                if (!matchIndex.mark(item.types, item.quantity)) {
                    return false;
                }
            }
            return matchIndex.allHit() ? (fast ? true : matchIndex.result) : false;
        } else {
            throw 'unsupported'
        }
    }

    static describe(selectionMatcher: IConstraintMatcher) {
        if (selectionMatcher.selector === 'matchAll') {
            return `at least ${selectionMatcher.minQuantity} of ${stringifyTypes(selectionMatcher.types!, selectionMatcher.minQuantity!)}`;
        } else if (selectionMatcher.selector === 'matchSequence') {
            let out = '';
            const sequence = selectionMatcher.sequence as Array<IConstraintMatcherSequence>;
            for (let i = 0; i < sequence.length; ++i) {
                const item = sequence[i];
                if (i !== 0) {
                    out += i === sequence.length - 1 ? ' and ' : ', ';
                }
                out += item.quantity + ' ' + stringifyTypes(item.types, item.quantity);
            }
            return out;
        } else {
            throw 'unsupported'
        }
    }

    collectEquations(equations: IdList<Equation>) {
        this.schema.collectEquations(equations, this._params);
    }
}


export class MatchIndex {

    public selection: Array<SketchObject>;
    private typeMap: Map<string, any>;

    public result: Array<SketchObject> | null;
    private totalHits: number;

    constructor(selection: Array<SketchObject>) {
        this.selection = selection;
        this.typeMap = new Map();

        selection.forEach(obj => {
            let info = this.typeMap.get(obj.class);
            if (!info) {
                info = {
                    hits: 0,
                    objects: []
                };
                this.typeMap.set(obj.class, info);
            }
            info.objects.push(obj);
        });

        this.result = [];
        this.totalHits = 0;
    }

    reset(fast: boolean, sequence: Array<IConstraintMatcherSequence>) {
        let typesOrder = new Map<string, number>();
        sequence.forEach((seq) => {
            seq.types.forEach((type) => {
                typesOrder.set(type, seq.order);
            })
        });
        this.selection.sort((a, b) => {
            const oa = typesOrder.get(a.class);
            const ob = typesOrder.get(b.class);
            if (oa && ob) {
                return oa > ob ? 1 : -1;
            }
            return -1;
        });
        this.typeMap.forEach(i => i.hits = 0);
        this.result = fast ? null : [];
        this.totalHits = 0;
    }

    mark(types: Array<string>, quantity: number) {
        for (let type of types) {
            const info = this.typeMap.get(type);
            if (!info) {
                continue;
            }
            const toAdd = Math.min(quantity, info.objects.length - info.hits);
            if (this.result) {
                for (let i = 0; i < toAdd; ++i) {
                    this.result.push(info.objects[info.hits + i]);
                }
            }
            quantity -= toAdd;
            info.hits += toAdd;
            this.totalHits += toAdd;
        }
        return quantity === 0;
    }

    allHit() {
        return this.selection.length === this.totalHits;
    }
}

function stringifyTypes(types: Array<string>, minQuantity: number) {
    return types.map(t => t.replace('SKETCH.', '') + (minQuantity > 1 ? 's' : '')).join(' or ');
}
