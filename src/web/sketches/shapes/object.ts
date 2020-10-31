import SketchShape from "@/web/sketches/shape";
import Sketcher from "@/web/sketches/sketcher";
import EndPoint from "@/web/sketches/shapes/point";
import Vector from "@/web/math/vector";
import Constraint from "@/web/sketches/constraints/constraint";
import Layer from "@/web/sketches/layer";
import Dimension from "@/web/sketches/shapes/dim";


/**
 * Sketch Object
 */
abstract class SketchObject extends SketchShape {

    parent: SketchObject | null;
    children: Array<SketchObject>;

    public constraints: Set<Constraint>;

    protected dims: Array<Dimension>;

    protected constructor(id: number = 0) {
        super(id);

        this.parent = null;
        this.children = [];

        this.constraints = new Set();
        this.dims = [];
    }

    get info() {
        let infos: Array<any> = [...super.info];
        if (this.parent !== null) {
            infos.push({'parent': this.parent.baseInfo});
        }
        this.children.forEach((child) => {
            infos.push({'child': child.baseInfo});
        });
        return infos;
    }

    get effectiveLayer() {
        let shape = this;
        while (shape) {
            if (shape.layer) {
                return shape.layer;
            }
            //@ts-ignore
            shape = shape.parent;
        }
        return null;
    }

    get constraintExist() {
        if (this.constraints.size !== 0) return true;
        for (let child of this.children) {
            if (child.constraintExist) return true;
        }
        return false;
    }

    clear() {
    }

    isSketchObject() {
        return true;
    }

    can_delete() {
        return this.isRoot;
    }

    addDim(layer: Layer, dim: Dimension) {
        this.dims.push(dim);
    }

    removeDim(layer: Layer) {
        this.traverseReversely((obj: SketchObject) => {
            obj.dims.forEach((dim) => {
                layer.removeAndFree(dim);
            });
            obj.dims.forEach((item) => {
                // notify to its parents
                const dim = item as Dimension;
                dim.parents.forEach((parent) => {
                    parent.dims = [];
                })
            })
        });
    }

    addChild(child: SketchObject) {
        this.children.push(child);
        child.parent = this;
    }

    removeChild(child: SketchObject) {
        let index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    accept(visitor: Function) {
        for (let child of this.children) {
            if (!child.accept(visitor)) {
                return false;
            }
        }
        return visitor(this);
    }

    traverse(visitor: Function) {
        for (const child of this.children) {
            child.accept(visitor);
        }
        visitor(this);
    }

    traverseReversely(visitor: Function) {
        visitor(this);
        for (let i = this.children.length - 1; i >= 0; --i) {
            this.children[i].accept(visitor);
        }
    }

    updateRelations() {
        if (this.children.length === 0) return;

        const newChildren = new Array<SketchObject>(this.children.length);
        for (let i = 0; i < this.children.length; ++i) {
            const child = this.children[i];
            child.parent = this;
            newChildren[i] = child;

            child.updateRelations();
        }
        this.children = newChildren;
    }

    abstract visitParams(callback: Function): void;

    abstract referencePoint(): EndPoint | null;

    recoverIfNecessary() {
        return false;
    }

    visitLinked(cb: Function) {
        cb(this);
    }

    translate(dx: number, dy: number) {
        if (this.readOnly) return;

        this.visitLinked((obj: SketchObject) => {
            obj.translateImpl(dx, dy);
        });
    }

    translateImpl(dx: number, dy: number) {
        this.accept(function (obj: SketchObject) {
            if (obj.class === ENDPOINT) {
                obj.translate(dx, dy);
            }
            return true;
        });
    }

    removeMarker(style: any) {
        const index = this.markers.indexOf(style);
        if (index !== -1) {
            this.markers.splice(index, 1);
        }
    }

    get marked() {
        return this.markers.length !== 0;
    }

    draw(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher) {
        if (!this.visible) return;

        let style = this.getCustomerStyle();
        if (style !== null) {
            ctx.save();
            viewer.setStyle(style, ctx);
        }

        this.drawImpl(ctx, scale, viewer);
        if (style !== null) ctx.restore();
    }

    getCustomerStyle() {
        if (this.markers.length !== 0) {
            return this.markers[0];
        }
        return null;
    }

    abstract drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void;

    abstract copy(): SketchObject;

    mirror(dest: SketchObject, mirroringFunc: Function) {
        let sourcePoints: Array<SketchObject> = [];

        pointIterator(this, (o: SketchObject) => {
            sourcePoints.push(o);
        });

        let i = 0;
        pointIterator(dest, (o: SketchObject) => {
            sourcePoints[i++].mirror(o, mirroringFunc);
        });
    }

    tessellation(): Array<EndPoint> {
        return [];
    }

    ancestry(cb: Function) {
        let obj = this;
        while (obj) {
            cb(obj);
            //@ts-ignore
            obj = obj.parent;
        }
    }

    root() {
        let obj = this;
        while (obj.parent) {
            //@ts-ignore
            obj = obj.parent;
        }
        return obj;
    }

    get isRoot() {
        return this.parent === null;
    }

    abstract normalDistance(aim: Vector, scale: number): number;
}

export const ENDPOINT = 'SKETCH.EndPoint';
export const SEGMENT = 'SKETCH.Segment';
export const CIRCLE = 'SKETCH.Circle';
export const ARC = 'SKETCH.Arc';
export const BRUSH = 'SKETCH.Brushes';
export const SPLINE = 'SKETCH.Spline';
export const LINEAR_DIMENSION = 'DIMENSION.Linear';
export const ANGULAR_DIMENSION = 'DIMENSION.Angular';

export const SketchTypes = {
    POINT: ENDPOINT,
    SEGMENT: SEGMENT,
    ARC: ARC,
    CIRCLE: CIRCLE
};


export function pointIterator(shape: SketchObject, func: Function) {
    shape.accept((o: SketchObject) => {
        if (o.class === ENDPOINT) {
            func(o);
        }
        return true;
    });
}

export default SketchObject;
