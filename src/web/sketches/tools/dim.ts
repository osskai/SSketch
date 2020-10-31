import BaseTool from "@/web/sketches/tools/tool";
import Segment from "@/web/sketches/shapes/segment";
import Sketcher from "@/web/sketches/sketcher";
import {DragDimensionTool} from "@/web/sketches/tools/drag";
import EndPoint from "@/web/sketches/shapes/point";
import {AngleDimension, LinearDimension} from "@/web/sketches/shapes/dim";
import SketchObject, {ENDPOINT, SEGMENT} from "@/web/sketches/shapes/object";
import {cross2d, distance, _negate} from '@/web/math/vec';
import {findCenter} from '../shapes/utils';


/**
 * @class LinearDimTool
 */
class LinearDimTool extends BaseTool {

    private readonly pA: EndPoint;
    private readonly sB: SketchObject;
    private dim: LinearDimension | null;
    private readonly dimCreation: Function;

    constructor(viewer: Sketcher, pA: EndPoint, sB: SketchObject) {
        super(viewer, 'linear measure');

        this.pA = pA;
        this.sB = sB;
        this.dim = null;
        this.dimCreation = (a: EndPoint, b: Segment | EndPoint) => new LinearDimension(viewer.dimLayer, a, b);
    }

    restart() {
        this.viewer.toolManager.releaseControl();
    }

    mouseup(e: MouseEvent) {
        if (this.dim === null) {
            this.dim = this.dimCreation(this.pA, this.sB);
            this.viewer.dimLayer.addAndAllocate(this.dim!);
        } else {
            this.viewer.toolManager.switchTool(new DragDimensionTool(this.viewer, this.dim));
            this.viewer.toolManager.currentTool.mousedown(e);
        }
    }
}


class AngleDimTool extends BaseTool {

    private readonly segA: Segment;
    private readonly segB: Segment;
    private dim: AngleDimension | null;
    private readonly dimCreation: Function;

    constructor(viewer: Sketcher, segA: Segment, segB: Segment) {
        super(viewer, 'angle measure');

        this.segA = segA;
        this.segB = segB;
        this.dim = null;
        this.dimCreation = (a: Segment, b: Segment) => new AngleDimension(viewer.dimLayer, a, b);
    }

    restart() {
        this.viewer.toolManager.releaseControl();
    }

    mousemove(e: MouseEvent) {
        const p = this.viewer.screenToModel(e);
        const result = this.viewer.search(p.x, p.y, 20, true, false, []).filter(o =>
            o.class === SEGMENT);

        if (this.dim !== null) {
            let [center, configuration] = this.classify(p.x, p.y);
            if (configuration) {
                this.dim.configuration = configuration as Array<EndPoint>;
            }
            if (!center) {
                center = (result[0] as Segment).a.data();
            }
            let [cx, cy] = center as Array<number>;
            this.dim.offset = distance([cx, cy], [p.x, p.y]);

            this.viewer.refresh();
        }
    }

    mouseup(e: MouseEvent) {
        const p = this.viewer.screenToModel(e);
        if (this.dim === null) {
            this.dim = this.dimCreation(this.segA, this.segB);
            let [center, configuration] = this.classify(p.x, p.y);
            if (configuration) {
                this.dim!.configuration = configuration as Array<EndPoint>;
            }
            if (!center) {
                center = this.segB.a.data();
            }
            const [cx, cy] = center as Array<number>;
            this.dim!.offset = distance([cx, cy], [p.x, p.y]);
            this.viewer.dimLayer.addAndAllocate(this.dim!);
        } else {
            this.viewer.toolManager.switchTool(new DragDimensionTool(this.viewer, this.dim));
            this.viewer.toolManager.currentTool.mousedown(e);
        }
    }

    private classify(px: number, py: number) {
        if (this.dim === null) return [];

        const line1 = this.dim.dimA, line2 = this.dim.dimB;

        const v1 = line1.direction().data();
        const v2 = line2.direction().data();

        const isec = findCenter(line1.a, line1.b, line2.a, line2.b, v1[0], v1[1], v2[0], v2[1]);
        if (!isec) {
            return [];
        }

        const [cx, cy] = isec;
        const v = [px - cx, py - cy];

        const insideSector = (v: Array<number>, v1: Array<number>, v2: Array<number>) => cross2d(v1, v) > 0 && cross2d(v2, v) < 0;

        if (insideSector(v, v1, v2)) {
            return [isec, [line1.a, line1.b, line2.a, line2.b]];
        }

        if (insideSector(v, v2, _negate(v1))) {
            return [isec, [line2.a, line2.b, line1.b, line1.a]];
        }
        _negate(v1);

        if (insideSector(v, _negate(v1), _negate(v2))) {
            return [isec, [line1.b, line1.a, line2.b, line2.a]];
        }
        _negate(v1);
        _negate(v2);

        if (insideSector(v, _negate(v2), v1)) {
            return [isec, [line2.b, line2.a, line1.a, line1.b]];
        }


        return [isec];
    }
}


export default class MeasureTool extends BaseTool {

    private pickA: SketchObject | null;
    private pickB: SketchObject | null;
    private deputyTool: LinearDimTool | AngleDimTool | null;

    constructor(viewer: Sketcher) {
        super(viewer, 'measure');

        this.pickA = null;
        this.pickB = null;
        this.deputyTool = null;
    }

    mousedown(e: MouseEvent) {
        super.mousedown(e);
        const picked = this.viewer.pick(e);
        if (picked.length > 0) {
            if (this.pickA === null) {
                this.pickA = picked[0] as SketchObject;
            } else {
                this.pickB = picked[0] as SketchObject;
                if (picked[0].nodeId !== this.pickA.nodeId) {
                    if (this.pickA.class === ENDPOINT) {
                        this.deputyTool = new LinearDimTool(this.viewer, this.pickA as EndPoint, this.pickB);
                    } else if (this.pickA.class === SEGMENT && this.pickB.class === SEGMENT) {
                        this.deputyTool = new AngleDimTool(this.viewer, this.pickA as Segment, this.pickB as Segment);
                    }
                } else if (this.pickA.class === SEGMENT) {
                    const segment = this.pickA as Segment;
                    this.deputyTool = new LinearDimTool(this.viewer, segment.a, segment.b);
                }
            }

            this.viewer.select([picked[0]], false);
            if (this.deputyTool !== null) {
                this.deputyTool!.mouseup(e);
                this.viewer.toolManager.switchTool(this.deputyTool!);
                this.viewer.unHighlight();
            }
        }
    }

    mousemove(e: MouseEvent) {
        if (this.deputyTool !== null) {
            this.deputyTool.mousemove(e);
        } else {
            const p = this.viewer.screenToModel(e);
            const result = this.viewer.search(p.x, p.y, 20, true, false, []).filter(o =>
                o.class === SEGMENT || o.class === ENDPOINT);
            if (result.length > 0) {
                //@ts-ignore
                this.viewer.highlight([result[0]], true);
            } else {
                this.viewer.unHighlight();
            }
        }
    }
}
