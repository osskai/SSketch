import Sketcher from "@/web/sketches/sketcher";
import SketchShape from "@/web/sketches/shape";
import SketchObject from "@/web/sketches/shapes/object";
import TaggedObject, { SM_alloc, SM_free} from "@/web/managers/om";


export default class Layer {

    private viewer: Sketcher;
    public name: string;
    public readOnly: boolean;

    public style: any;
    objects: Array<SketchShape>;

    constructor(viewer: Sketcher, name: string, style: any) {
        this.viewer = viewer;
        this.name = name;
        this.readOnly = false;

        this.style = style;
        this.objects = [];
    }

    removeAndFree(object: SketchShape) {
        object.traverseReversely((o: SketchShape) => {
            this._remove(o);
            if (o.status === TaggedObject.CREATED) {
                SM_free(o);
            }
        });
        this.viewer.refresh();
    }

    _remove(object: SketchShape) {
        const idx = this.objects.indexOf(object);
        if (idx !== -1) {
            this.objects.splice(idx, 1);
            this.viewer.objectsUpdate();
            return true;
        }
        return false;
    }

    addAndAllocate(object: SketchShape, id?: number) {
        // add the object and its children to the layer
        object.traverse((o: SketchShape) => {
            if (o.status !== TaggedObject.MODIFY) {
                this._add(SM_alloc(o, id));
            } else {
                this._add(o);
                o.status = TaggedObject.CREATED;
            }
        });
        this.viewer.refresh();
    }

    private _add(object: SketchShape) {
        if (object.layer !== undefined) {
            if (object.layer !== null) {
                let removed = object.layer._remove(object);
                if (!removed) {
                    object.layer._addAndNotify(object);
                    return;
                }
            }
            if (object.layer !== this) {
                object.layer = this;
                this._addAndNotify(object);
            }
        } else {
            this._addAndNotify(object);
        }
    };

    _addAndNotify(object: SketchShape) {
        this.objects.push(object);
        this.viewer.objectsUpdate();
    }
}
