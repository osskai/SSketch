import Sketcher from "@/web/sketches/sketcher";
import TaggedObject from "@/web/managers/om";
import Layer from "@/web/sketches/layer";
import Vector from "@/web/math/vector";

/**
 * abstract base class to draw the shape
 */
abstract class SketchShape extends TaggedObject {

    protected _visible: boolean;
    protected params: any;

    layer: Layer | null;
    readOnly: boolean;

    protected __disposed: boolean;
    protected readonly markers: any[];

    protected constructor(id?: number) {
        super(id);

        this._visible = true;
        this.readOnly = false;
        this.layer = null;

        this.__disposed = false;
        this.markers = [];
    }

    get param() {
        return this.params;
    }

    get info() {
        return [...super.info, this._visible, {'params': this.params}]
    }

    get visible() {
        return this._visible;
    }

    set visible(val) {
        this._visible = val;
    }

    get disposed() {
        return this.__disposed;
    }

    set disposed(value: boolean) {
        this.__disposed = value;
    }

    isSketchObject() {
        return false;
    }

    accept(visitor: Function) {
        return visitor(this);
    }

    abstract draw(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void;

    abstract traverse(visitor: Function): void;

    abstract traverseReversely(visitor: Function): void;

    addMarker(style: any) {
        this.markers.push(style);
        this.markers.sort((a, b) => (a.priority || 99999) - (b.priority || 99999))
    }

    removeMarker(style: any) {
        const index = this.markers.indexOf(style);
        if (index !== -1) {
            this.markers.splice(index, 1);
        }
    }

    /**
     * it cannot be picked by default
     * @param aim
     * @param scale
     */
    normalDistance(aim: Vector, scale: number) {
        return -1;
    }

    translate(dx: number, dy: number) {
        // do nothing
    }
}



export default SketchShape;
