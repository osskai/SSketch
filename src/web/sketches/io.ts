import Arc from './shapes/arc';
import Circle from './shapes/circle';
import SketchObject, {ARC, CIRCLE, ENDPOINT, SEGMENT} from './shapes/object';
import EndPoint from './shapes/point';
import Segment from './shapes/segment';
import Sketcher from './sketcher';
import {Styles} from "@/web/sketches/styles";
import SketchShape from "@/web/sketches/shape";
import Constraint from "@/web/sketches/constraints/constraint";
import {syslog} from "@/web/syslog";


export default class SketchIO {

    private readonly viewer: Sketcher;

    constructor(viewer: Sketcher) {
        this.viewer = viewer;
    }

    exportSketch(name: string) {
        alert("not support yet");
    }

    loadSketch(data: any) {
        return this._loadSketch(JSON.parse(data));
    }

    private _loadSketch(sketch: any) {
        this.cleanUpData();

        const index: Map<number, any> = new Map();

        function endPoint(p: ISavedPointData) {
            let ep = index.get(p.id);
            if (ep === undefined) {
                ep = new EndPoint(p.x.val, p.y.val, p.id);
                index.set(p.id, ep);
            }
            return ep;
        }

        const getSpace = (pointer: number | undefined) => {
            if (pointer === undefined) {
                return this.viewer.constraintManager.spaces[0];
            }
            return this.viewer.constraintManager.getSpace(pointer);
        };

        let layerIdGen = 0;

        function getLayer(viewer: Sketcher, name: string) {
            if (name === undefined) {
                name = "layer_" + layerIdGen++;
            } else {
                for (let i = 0; i < viewer.layers.length; ++i) {
                    if (name === viewer.layers[i].name) {
                        return viewer.layers[i];
                    }
                }
            }
            let layer = viewer.createLayer(name, Styles.DEFAULT);
            viewer.layers.push(layer);

            return layer;
        }

        const sketchLayers = sketch.layers;
        if (sketchLayers !== undefined) {
            for (let l = 0; l < sketchLayers.length; ++l) {
                let ioLayer = sketchLayers[l];
                let layerName = ioLayer.name;
                let layer = getLayer(this.viewer, layerName);
                layer.readOnly = !!ioLayer.readOnly;
                let layerData = ioLayer.data;
                for (let i = 0; i < layerData.length; ++i) {
                    let obj = layerData[i];
                    let sketchObject: SketchObject | null = null;
                    if (obj.class === SEGMENT) {
                        const a = endPoint(obj.data[0]);
                        const b = endPoint(obj.data[1]);
                        sketchObject = new Segment(a, b);
                    } else if (obj.class === ENDPOINT) {
                        sketchObject = endPoint(obj.data[0]);
                    } else if (obj.class === ARC) {
                        const a = endPoint(obj.data[0]);
                        const b = endPoint(obj.data[1]);
                        const c = endPoint(obj.data[2]);
                        sketchObject = new Arc(a, b, c);
                    } else if (obj.class === CIRCLE) {
                        const c = endPoint(obj.data[0]);
                        sketchObject = new Circle(c, obj.data[1]);
                    }

                    if (sketchObject != null) {
                        // add and allocate the ids
                        layer.addAndAllocate(sketchObject, obj.id);
                        index.set(obj.id, sketchObject);
                        //reindex non point children to recover constraints
                        const childrenIds = obj.children;
                        if (childrenIds) {
                            const children = nonPointChildren(sketchObject);
                            for (let childIdx = 0; childIdx < childrenIds.length; childIdx++) {
                                index.set(childrenIds[childIdx], children[childIdx]);
                            }
                        }
                    }
                }
            }
        }

        if (sketch.spaces.length !== 0) {
            this.viewer.constraintManager.startTransaction();

            for (const space of sketch.spaces) {
                for (const constr of space.constraints) {
                    try {
                        const constraint = Constraint.read(constr, index);
                        const space = getSpace(constr.space || 0);
                        space.addConstraint(constraint);
                    } catch (e) {
                        syslog.error("skipping errant constraint", constr);
                    }
                }
            }

            this.viewer.constraintManager.finishTransaction();
        }
    }

    private cleanUpData() {
        this.viewer.clear();
        this.viewer.deselectAll();
        this.viewer.constraintManager.reset();
    };

    serializeSketch(data: any) {
        return JSON.stringify(this._serializeSketch(data));
    }

    private _serializeSketch(metadata: any) {
        function point(p: EndPoint): ISavedPointData {
            return {
                id: p.nodeId,
                x: {
                    id: p.param.x.id,
                    val: p.x
                },
                y: {
                    id: p.param.y.id,
                    val: p.y
                }
            };
        }

        const sketch: any = {};
        sketch.layers = [];
        let toSave = [this.viewer.layers];
        for (let t = 0; t < toSave.length; ++t) {
            let layers = toSave[t];
            for (let l = 0; l < layers.length; ++l) {
                let layer = layers[l];
                let toLayer: IJsonLayer = {name: layer.name, readOnly: layer.readOnly, data: []};
                sketch.layers.push(toLayer);
                for (let i = 0; i < layer.objects.length; ++i) {
                    const obj = layer.objects[i];
                    let to: IJsonLayerData = {id: obj.nodeId, class: obj.class, data: []};
                    if (obj.class === SEGMENT) {
                        const segment = obj as Segment;
                        to.data = [point(segment.a), point(segment.b)];
                    } else if (obj.class === ENDPOINT) {
                        to.data = [point(obj as EndPoint)];
                    } else if (obj.class === ARC) {
                        const arc = obj as Arc;
                        to.data = [point(arc.a), point(arc.b), point(arc.c)];
                    } else if (obj.class === CIRCLE) {
                        const circle = obj as Circle;
                        to.data = [point(circle.c), circle.r];
                    }
                    toLayer.data.push(to);

                    const children = nonPointChildren(obj).map(c => c.nodeId);
                    if (children.length !== 0) {
                        to.children = children;
                    }
                }
            }
        }

        sketch.spaces = [];
        for (let space of this.viewer.constraintManager.spaces) {
            const spaceData: {
                constraints: Array<Constraint>
            } = {constraints: []};
            const systemConstraints = space.constraintEntries;
            for (const sc of systemConstraints) {
                spaceData.constraints.push(sc.savedInfo);
            }
            if (spaceData.constraints.length === 0) continue;
            sketch.spaces.push(spaceData);
        }

        sketch.scene = {
            dx: this.viewer.translate.x,
            dy: this.viewer.translate.y,
            scale: this.viewer.scale,
        };
        sketch.metadata = metadata;
        sketch.version = 2;

        return sketch;
    }
}

interface IJsonLayer {
    name: string;
    readOnly: boolean;
    data: any;
}

interface IJsonLayerData {
    id: number;
    class: string;
    data: any[];
    children?: any;
}

interface ISavedPointData {
    id: number;
    x: { id: number, val: number };
    y: { id: number, val: number };
}

function nonPointChildren(obj: SketchShape) {
    const children: Array<SketchObject> = [];
    obj.accept((o: SketchObject) => {
        if (o.class !== ENDPOINT) {
            children.push(o);
        }
        return true;
    });

    return children;
}
