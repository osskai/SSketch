import SketchObject, {ENDPOINT} from "@/web/sketches/shapes/object";
import Layer from "@/web/sketches/layer";
import {Styles} from "@/web/sketches/styles";
import SketchShape from "@/web/sketches/shape";
import Vector from "@/web/math/vector";
import StateStream from "@/web/stream/state";
import Emitter from "@/web/stream/emitter";
import Matrix3 from "@/web/math/matrix";
import ToolManager, {ISketchToolStream} from "@/web/sketches/tools/manager";
import PanTool from "@/web/sketches/tools/pan";
import Command from "@/web/sketches/commands/command";
import {ReferenceLine, ReferencePoint} from "@/web/sketches/shapes/refs";
import {OM_ask_objects_count, SM_dispose} from "@/web/managers/om";
import ConstraintManager, {ISketchConstraintStream} from "@/web/sketches/constraints/manager";
import Constraint, {MatchIndex} from '@/web/sketches/constraints/constraint';
import {ConstraintActions} from "@/web/sketches/constraints/actions";
import HistoryManager from "@/web/sketches/commands/manager";
import SketchIO from './io';
import {syslog} from "@/web/syslog";
import SolverSpace from "@/web/sketches/constraints/solverspace";
import {ERROR_CHECK_WORLD} from "@/web/errors";


// streams through the sketcher
interface ISketchStream {
    selection: StateStream;
    highlight: StateStream;
    objectUpdate: Emitter;
    tool: ISketchToolStream;
    constraints: ISketchConstraintStream;
}


/**
 * main class for the sketch
 */
export default class Sketcher {

    canvas: HTMLCanvasElement | null;
    private readonly ctx: CanvasRenderingContext2D | null;

    public streams: ISketchStream;
    private readonly captured: {
        selection: any,
        highlight: any,
        tool: any
    };

    public toolManager: ToolManager;
    private historyManager: HistoryManager;
    public constraintManager: ConstraintManager;

    private _activeLayer: Layer | null;
    private readonly _dimLayer: Layer;
    private readonly _constraintLayer: Layer;
    private readonly _layers: Array<Layer>;
    private readonly _workspace: Array<Array<Layer>>;
    private readonly _serviceWorkspace: Array<Array<Layer>>;

    private transformation: any;
    public translate: { x: number, y: number };
    public scale: number;
    private screenToModelMatrix: any;

    private __prevStyle: null;

    private onWindowResize: () => void;

    private readonly IO: SketchIO;

    constructor(canvas: HTMLCanvasElement) {
        // main canvas
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        // canvas stream
        this.streams = sketcherStream(this);

        // updates canvas size
        function updateCanvasSize() {
            const canvasWidth = window.innerWidth > 900 ? 750 : window.innerWidth - 150;
            const canvasHeight = window.innerHeight > 600 ? 400 : window.innerHeight - 200;

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            canvas.style.width = canvasWidth + "px";
            canvas.style.height = canvasHeight + "px";
        }

        this.onWindowResize = () => {
            updateCanvasSize();
            this.refresh();
        };
        updateCanvasSize();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this._activeLayer = null;
        this._layers = [
            this.createLayer("_sketch", Styles.DEFAULT)
        ];
        this._dimLayer = this.createLayer("_dim", Styles.DIM);
        this._constraintLayer = this.createLayer("_constraint", Styles.ANNOTATIONS);
        this._workspace = [this._layers, [this._dimLayer, this._constraintLayer]];
        this._serviceWorkspace = [this._createServiceLayers()];

        this.toolManager = new ToolManager(this, new PanTool(this));
        this.historyManager = new HistoryManager(this);
        this.constraintManager = new ConstraintManager(this);

        // transform
        this.translate = {x: canvas.width / 2, y: canvas.height / 2};
        this.scale = 1.0;

        this.captured = Object.create({});
        //@ts-ignore
        Object.keys(CAPTURES).forEach(key => this.captured[key] = []);

        this.IO = new SketchIO(this);
    }

    get io() {
        return this.IO;
    }

    /**
     * selection
     */
    get selected(): Array<SketchObject> {
        return this.captured.selection;
    }

    select(objs: Array<SketchShape>, exclusive: boolean) {
        this.capture('selection', objs, exclusive);
        this.streams.selection.next(this.selected);
    }

    deselect(obj: SketchShape) {
        this.withdraw('selection', obj);
        this.streams.selection.next(this.selected);
    }

    deselectAll() {
        this.withdrawAll('selection');
        this.streams.selection.next(this.selected);
    }

    /**
     * highlight
     */
    get highlighted() {
        return this.captured.highlight;
    }

    highlight(objs: Array<SketchObject>, exclusive: boolean) {
        this.capture('highlight', objs, exclusive);
        this.streams.highlight.next(this.highlighted);
    }

    unHighlight() {
        this.withdrawAll('highlight');
        this.streams.highlight.next(this.highlighted);
    }

    /**
     * snapped
     */
    get snapped(): SketchObject {
        return this.captured.tool[0] || null;
    }

    cleanSnap() {
        this.withdrawAll('tool');
    }

    snap(x: number, y: number, excl: Array<any>, onlySearchPoint = true, excludePoint = false) {
        this.cleanSnap();
        const snapTo = this.search(x, y, 20, true, onlySearchPoint, excl, excludePoint);
        if (snapTo.length > 0) {
            //@ts-ignore
            this.capture('tool', [snapTo[0]], true);
            this.refresh();
        }
        return this.snapped;
    }

    capture(type: string, objs: Array<SketchShape>, exclusive: boolean) {
        if (exclusive) this.withdrawAll(type);
        //@ts-ignore
        const captured = this.captured[type];
        for (let i = 0; i < objs.length; i++) {
            const obj = objs[i];
            if (captured.indexOf(obj) === -1) {
                captured.push(obj);
                // @ts-ignore
                obj.addMarker(CAPTURES[type]);
            }
        }
    }

    private withdraw(type: string, obj: SketchShape) {
        //@ts-ignore
        let captured = this.captured[type];
        for (let i = 0; i < captured.length; i++) {
            if (obj === captured[i]) {
                // @ts-ignore
                captured.splice(i, 1)[0].removeMarker(CAPTURES[type]);
                this.refresh();
                break;
            }
        }
    }

    private withdrawAll(type: string) {
        //@ts-ignore
        const captured = this.captured[type];
        for (let i = 0; i < captured.length; i++) {
            // @ts-ignore
            captured[i].removeMarker(CAPTURES[type]);
        }
        while (captured.length > 0) captured.pop();

        this.refresh();
    }

    /***
     * layers
     */

    get layers() {
        return this._layers;
    }

    get activeLayer() {
        let layer = this._activeLayer;
        if (layer === null || layer.readOnly) {
            layer = null;
            for (let i = 0; i < this._layers.length; i++) {
                let l = this._layers[i];
                if (!l.readOnly) {
                    layer = l;
                    break;
                }
            }
        }
        if (layer === null) {
            layer = this.createLayer("_sketch", Styles.DEFAULT);
            this._layers.push(layer);
        }
        return layer;
    }

    set activeLayer(layer: Layer) {
        if (!layer.readOnly) {
            this._activeLayer = layer;
        }
    }

    get dimLayer() {
        return this._dimLayer;
    }

    get constraintLayer() {
        return this._constraintLayer;
    }

    createLayer(name: string, style: any) {
        return new Layer(this, name, style);
    }

    private _createServiceLayers() {
        let layer = this.createLayer("_service", Styles.SERVICE);
        layer.objects.push(new ReferencePoint(0, 0));
        // horizontal
        layer.objects.push(new ReferenceLine(new Vector(-8192, 0), new Vector(8192, 0)));
        // vertical
        layer.objects.push(new ReferenceLine(new Vector(0, -8192), new Vector(0, 8192)));
        return [layer];
    }

    /**
     * updates
     */
    objectsUpdate() {
        this.streams.objectUpdate.next(undefined);
    }

    refresh() {
        window.requestAnimationFrame(() => {
            if (!this.isDisposed()) {
                this.repaint();
            }
        });
    }

    private static __SKETCH_DRAW_PIPELINE = [
        (obj: SketchObject) => !isEndPoint(obj) && !obj.marked,
        (obj: SketchObject) => !isEndPoint(obj) && obj.marked,
        (obj: SketchObject) => isEndPoint(obj) && !obj.marked,
        (obj: SketchObject) => isEndPoint(obj) && obj.marked
    ];

    private static __SIMPLE_DRAW_PIPELINE = [
        (obj: SketchShape) => true
    ];

    private repaint() {
        // define the transformation firstly
        const ctx = <CanvasRenderingContext2D>this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
        ctx.transform(1, 0, 0, -1, 0, this.canvas!.height);

        if (this.transformation) {
            let [a, b, c, d, e, f] = this.transformation;
            ctx.transform(a, b, c, d, e, f);
        } else {
            ctx.transform(1, 0, 0, 1, this.translate.x, this.translate.y);
            ctx.transform(this.scale, 0, 0, this.scale, 0, 0);
        }

        this.__prevStyle = null;

        this.__drawWorkspace(ctx, this._workspace, Sketcher.__SKETCH_DRAW_PIPELINE);
        this.__drawWorkspace(ctx, this._serviceWorkspace, Sketcher.__SIMPLE_DRAW_PIPELINE);
    }

    /**
     * draw workspace
     * @param ctx
     * @param workspace
     * @param pipeline
     * @private
     */
    __drawWorkspace(ctx: CanvasRenderingContext2D, workspace: Array<Array<Layer>>, pipeline: any) {
        for (let drawPredicate of pipeline) {
            for (let layers of workspace) {
                for (let layer of layers) {
                    for (let obj of layer.objects) {
                        obj.accept((obj: SketchShape) => {
                            if (!obj.visible) return true;
                            // only match the pipeline rules
                            if (drawPredicate(obj)) {
                                try {
                                    this.__draw(ctx, layer, obj);
                                } catch (e) {
                                    console.warn(e);
                                }
                            }
                            return true;
                        });
                    }
                }
            }
        }
    }

    /**
     * function to call the draw of sketch object
     * @param ctx
     * @param layer
     * @param obj
     * @private
     */
    private __draw(ctx: CanvasRenderingContext2D, layer: Layer, obj: SketchShape) {
        const style = this.getStyleForObject(layer, obj);
        if (style !== this.__prevStyle) {
            this.setStyle(style, ctx);
        }
        this.__prevStyle = style;

        obj.draw(ctx, this.scale, this);
    }

    /**
     * styles
     */
    getStyleForObject(layer: Layer, obj: SketchShape) {
        return layer.style;
    }

    setStyle(style: any, ctx: CanvasRenderingContext2D) {
        ctx.lineWidth = style.lineWidth / this.scale;
        ctx.strokeStyle = style.strokeStyle;
        ctx.fillStyle = style.fillStyle;
    }

    updateStyle(config: any) {
        this.ctx!.lineWidth = config.lineWidth / this.scale;
        this.ctx!.strokeStyle = config.lineColor;
    }

    /**
     * disposable
     */
    dispose() {
        window.removeEventListener('resize', this.onWindowResize.bind(this), false);
        this.canvas = null;
        this.toolManager.dispose();
        this.historyManager.dispose();
        this.clear();
    }

    isDisposed() {
        return this.canvas === null;
    };

    /**
     * same as the canvas transformation
     * @param a
     * @param b
     * @param c
     * @param d
     * @param e
     * @param f
     * @param zoom
     */
    setTransformation(a: number, b: number, c: number, d: number, e: number, f: number, zoom: number) {
        this.transformation = [a, b, c, d, e, f];
        this.scale = zoom;
        if (this.screenToModelMatrix === undefined) {
            this.screenToModelMatrix = new Matrix3();
        }
        this.screenToModelMatrix.set34(
            a, c, 0, e,
            b, d, 0, f,
            0, 0, 1, 0
        )._invert();
    }

    setScale(delta: number) {
        let step = Math.pow(0.95, 1);
        if (delta < 0) {
            step = 1 / step;
        }
        this.scale *= step;

        this.refresh();
    }

    /**
     * get the model coordinate from sceen
     * @param e
     */
    screenToModel(e: MouseEvent) {
        return this._screenToModel(e.offsetX, e.offsetY);
    }

    private _screenToModel(x: number, y: number) {
        const out = new Vector(0, 0);
        this.screenToModel2(x, y, out);
        return out;
    };

    screenToModel2(x: number, y: number, out: Vector) {
        out.x = x;
        out.y = this.canvas!.height - y;

        if (this.transformation) {
            out.z = 0;
            this.screenToModelMatrix!._apply(out);
        } else {
            out.x -= this.translate.x;
            out.y -= this.translate.y;

            out.x /= this.scale;
            out.y /= this.scale;
        }

        out.roundToPrecision(0);
    }

    screenToModelDistance(dist: number) {
        const measurer = new Vector();
        this.screenToModel2(0, 0, measurer);
        const x0 = measurer.x;
        this.screenToModel2(dist, 0, measurer);
        return Math.abs(measurer.x - x0);
    }

    /**
     * pick up
     * @param e
     */
    pick(e: MouseEvent) {
        const m = this.screenToModel(e);
        return this.search(m.x, m.y, 20, true, false, []);
    }

    search(x: number, y: number, buffer: number, deep: boolean, onlyPoints: boolean, filter: Array<any>,
           excludePoint: boolean = false) {
        function isFiltered(o: SketchShape) {
            for (let i = 0; i < filter.length; ++i) {
                if (filter[i] === o) return true;
            }
            return false;
        }

        buffer /= this.scale;
        buffer *= 0.5;

        let pickResult: Array<SketchShape> = [];
        let aim = new Vector(x, y);
        /**
         * search all the layers
         */
        let heroIdx = 0;
        let unreachable = buffer * 2;
        let heroLength = unreachable; // unreachable
        for (let layers of this._workspace) {
            for (let i = 0; i < layers.length; i++) {
                let objs = layers[i].objects;
                for (let j = 0; j < objs.length; j++) {
                    let l = unreachable + 1;
                    let before = pickResult.length;
                    objs[j].accept((o: SketchShape) => {
                        if (!o.visible) return true;
                        if ((onlyPoints && !isEndPoint(o)) || (excludePoint && isEndPoint(o))) {
                            return true;
                        }
                        l = o.normalDistance(aim, this.scale);
                        if (l >= 0 && l <= buffer && !isFiltered(o)) {
                            pickResult.push(o);
                            return false;
                        }
                        return true;
                    });
                    let hit = before - pickResult.length !== 0;
                    if (hit) {
                        if (!deep && pickResult.length != 0) return pickResult;
                        if (l >= 0 && l < heroLength) {
                            heroLength = l;
                            heroIdx = pickResult.length - 1;
                        }
                    }
                }
            }
        }
        if (pickResult.length > 0) {
            let _f = pickResult[0];
            pickResult[0] = pickResult[heroIdx];
            pickResult[heroIdx] = _f;
        }
        return pickResult;
    }

    roundToPrecision(value: number) {
        return value.toFixed(3);
    }

    /**
     * history
     */
    get canUndo() {
        return this.historyManager.canUndo();
    }

    get canRedo() {
        return this.historyManager.canRedo();
    }

    execute(cmd: Command) {
        this.historyManager.execute(cmd);
    }

    transactionExecute(cmds: Array<Command>) {
        this.historyManager.transaction.begin();
        cmds.forEach((cmd) => {
            this.historyManager.execute(cmd);
        });
        this.historyManager.transaction.end();
    }

    undo() {
        this.historyManager.undo();
        this.constraintManager.solve(true);
    }

    redo() {
        this.historyManager.redo();
        this.constraintManager.solve(true);
    }

    clear() {
        // clear the constraints
        this.constraintManager.clear();
        // clear all the objects
        const currentLayer = this.activeLayer;
        let num = currentLayer.objects.length;
        while (num > 0) {
            const obj = currentLayer.objects[num - 1] as SketchObject;
            currentLayer.removeAndFree(obj);
            num = currentLayer.objects.length;
        }
        // clear the undo and redo in history
        this.historyManager.reset();
        SM_dispose();
        this.refresh();
    }

    public addConstraint(id: number) {
        const action = ConstraintActions.get(id);
        if (action) {
            const matched = Constraint.matchSelection(action.selectionMatcher, new MatchIndex(this.selected), false);
            if (matched instanceof Array) {
                try {
                    this.constraintManager.addConstraintByCommand(action.invoke(this, matched));
                    const msg = 'Has added "' + action.name + '" constraint.';
                    this.streams.constraints.$message.next({
                        type: 'info',
                        message: msg
                    })
                } catch (e) {
                    syslog.error('fails to add the constraint');
                } finally {
                    this.constraintManager.solve(true);
                }
            } else {
                const msg = 'The action "' + action.name + '" requires selection of ' +
                    Constraint.describe(action.selectionMatcher);
                this.streams.constraints.$message.next({
                    type: 'error',
                    message: msg
                });
            }
            this.deselectAll();
        }
    }

    removeObjectConstraint(obj: SketchObject) {
        this.deselect(obj);
        this.constraintManager.removeObjects([obj]);
    }

    export() {
        this.IO.exportSketch('sketcher');
    }

    checkWorld() {
        try {
            // 1. check the parent-child relationships
            const objects = this.activeLayer.objects as Array<SketchObject>;
            const allocatedObjects = OM_ask_objects_count('SKETCH');
            if (objects.length !== allocatedObjects.size) {
                syslog.raise_error('displayed and allocated objects are incompatible',
                    ERROR_CHECK_WORLD, [objects.length, allocatedObjects.size]);
            }
            for (let object of objects) {
                // consider the single point
                if (object.class === ENDPOINT) continue;

                const children = object.children;
                children.forEach((child) => {
                    if (child.parent !== object) {
                        syslog.raise_error('object has child which is not belong to itself',
                            ERROR_CHECK_WORLD, child.parent ? child.parent.baseInfo : null, object.baseInfo)
                    }
                });
                if (children.length === 0 && object.isRoot) {
                    syslog.raise_error('object is isolated in the layer', ERROR_CHECK_WORLD, object.info);
                }
            }
            // 2. check the constraints
            const allocatedConstraints = OM_ask_objects_count('CONSTRAINT');
            this.constraintManager.spaces.forEach((space: SolverSpace) => {
                const constraints = space.constraintEntries;
                constraints.forEach((constraint) => {
                    if (!allocatedConstraints.has(constraint)) {
                        syslog.raise_error('constraint is not allocated', ERROR_CHECK_WORLD, constraint.info);
                    }
                    const oc = constraint.objects;
                    oc.forEach((obj: SketchObject) => {
                        if (!obj.constraints.has(constraint)) {
                            syslog.raise_error('constraint has object that do not has corresponding constraint',
                                ERROR_CHECK_WORLD, [constraint.info, obj.info]);
                        }
                    })
                })
            });
            syslog.debug('check world successes');
        } catch (e) {
            syslog.error('check world fails');
        }
    }
}

const isEndPoint = (o: SketchShape) => o.class === ENDPOINT;

/**
 *
 */
const CAPTURES = {
    tool: {
        ...Styles.TOOL_HELPER,
        priority: 2
    },
    highlight: {
        ...Styles.HIGHLIGHT,
        priority: 3
    },
    selection: {
        ...Styles.SELECTION,
        priority: 4
    },
};


function sketcherStream(viewer: Sketcher) {
    return {
        selection: new StateStream([]),
        highlight: new StateStream([]),
        // try to write into the syslog
        objectUpdate: new Emitter(),
        tool: {
            $change: new Emitter(),
            $message: new Emitter(),
            $hint: new Emitter()
        },
        constraints: {
            $message: new Emitter()
        }
    };
}
