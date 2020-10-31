import Sketcher from "@/web/sketches/sketcher";
import AbstractPickTool from "@/web/sketches/tools/pick";
import SketchObject, {CIRCLE, SEGMENT} from "@/web/sketches/shapes/object";
import {
    INTERSECTION, LEFTSIDE,
    lineCircleValidation,
    lineLineValidation,
    MULTIPLE_INTERSECTION,
    RIGHTSIDE
} from "@/web/math/intersections";
import Vector from "@/web/math/vector";
import Segment from "@/web/sketches/shapes/segment";
import EndPoint from "@/web/sketches/shapes/point";
import {SM_edit} from "@/web/managers/om";
import Circle from "@/web/sketches/shapes/circle";
import Arc from "@/web/sketches/shapes/arc";

const math = require('mathjs');

interface IIntersectPoint {
    tool: SketchObject;
    pt: {
        x: number,
        y: number
    };
    u: number;
    side: number;
}


/**
 * there are some cases needed to tbe consider
 */
export default class TrimTool extends AbstractPickTool {

    constructor(viewer: Sketcher) {
        super(viewer, 'trim');
    }

    restart() {
        this.sendHint('Sketch: select object(s) to trim.');
    }

    mousemove(e: MouseEvent) {
        let p = this.viewer.screenToModel(e);
        this.viewer.snap(p.x, p.y, [], false, true);
    }

    mouseup(e: MouseEvent): void {
        if (this.toPick !== null) {
            const pt = this.viewer.screenToModel(e);
            // TODO: currently, only support line and circle
            // try to trim the line
            if (this.toPick.class === SEGMENT) {
                const target = this.toPick as Segment;

                // the position of the pick point
                const vpa = new Vector(pt.x - target.a.x, pt.y - target.a.y);
                const delta = vpa.dot(target.direction()) / target.length();

                let pickTess = target.tessellation();
                const results: Array<IIntersectPoint> = [];

                const candidates = this.activeLayer.objects;
                // if there are many lines share the same endpoint, it will calculate the intersections, and cause some
                // undesired results.
                for (let candidate of candidates) {
                    const item = candidate as SketchObject;
                    // 1. exclude the same segment
                    if (item.nodeId === target.nodeId) continue;
                    // 2. exclude the segment shape the same endpoint
                    if (!target.shareNoCoincidentWith(item)) continue;

                    if (item.class === SEGMENT) {
                        let tess = item.tessellation();
                        const ans = lineLineValidation(pickTess[0].x, pickTess[0].y, pickTess[1].x, pickTess[1].y,
                            tess[0].x, tess[0].y, tess[1].x, tess[1].y);
                        if (ans.status === INTERSECTION) {
                            results.push({
                                tool: candidate as SketchObject,
                                pt: ans.point!,
                                u: ans.params!.u,
                                side: delta > ans.params!.u ? RIGHTSIDE : LEFTSIDE
                            })
                        }
                    } else if (item.class === CIRCLE) {
                        const circle = item as Circle;
                        const ans = lineCircleValidation(pickTess[0].x, pickTess[0].y, pickTess[1].x, pickTess[1].y,
                            circle.c.x, circle.c.y, circle.r);
                        if (ans.status === MULTIPLE_INTERSECTION) {
                            const p1 = {
                                tool: candidate as SketchObject,
                                pt: ans.point1!,
                                u: ans.params!.t,
                                side: delta > ans.params!.t ? RIGHTSIDE : LEFTSIDE
                            };
                            const p2 = {
                                tool: candidate as SketchObject,
                                pt: ans.point2!,
                                u: ans.params!.q!,
                                side: delta > ans.params!.q! ? RIGHTSIDE : LEFTSIDE
                            };
                            results.push(p1, p2);
                        } else if (ans.status === INTERSECTION) {
                            results.push({
                                tool: candidate as SketchObject,
                                pt: ans.point!,
                                u: ans.params!.t,
                                side: delta > ans.params!.t ? RIGHTSIDE : LEFTSIDE
                            })
                        }
                    }
                }

                const [start, end] = TrimTool.findLineEnds(results);
                if (start) {
                    if (end) {
                        const se1 = new Segment(SM_edit(target.a), new EndPoint(start.pt.x, start.pt.y));
                        const se2 = new Segment(new EndPoint(end.pt.x, end.pt.y), SM_edit(target.b));
                        this.addAndConsumeByCommand([se1, se2], [target]);

                        if (start.tool.class === SEGMENT) {
                            this.viewer.constraintManager.pointOnLine(se1.b, start.tool as Segment);
                        } else if (start.tool.class === CIRCLE) {
                            this.viewer.constraintManager.pointOnCircle(se1.b, start.tool as Circle);
                        }

                        if (end.tool.class === SEGMENT) {
                            this.viewer.constraintManager.pointOnLine(se2.a, end.tool as Segment);
                        } else if (end.tool.class === CIRCLE) {
                            this.viewer.constraintManager.pointOnCircle(se2.a, end.tool as Circle);
                        }
                    } else {
                        const seg = new Segment(SM_edit(target.a), new EndPoint(start.pt.x, start.pt.y));
                        this.addAndConsumeByCommand([seg], [target]);
                        if (start.tool.class === SEGMENT) {
                            this.viewer.constraintManager.pointOnLine(seg.b, start.tool as Segment);
                        } else if (start.tool.class === CIRCLE) {
                            this.viewer.constraintManager.pointOnCircle(seg.b, start.tool as Circle);
                        }
                    }
                } else if (end) {
                    const seg = new Segment(new EndPoint(end.pt.x, end.pt.y), SM_edit(target.b));
                    this.addAndConsumeByCommand([seg], [target]);
                    if (end.tool.class === SEGMENT) {
                        this.viewer.constraintManager.pointOnLine(seg.a, end.tool as Segment);
                    } else if (end.tool.class === CIRCLE) {
                        this.viewer.constraintManager.pointOnCircle(seg.a, end.tool as Circle);
                    }
                } else {
                    this.removeObjectsByCommand([this.toPick as SketchObject]);
                }
            } else if (this.toPick.class === CIRCLE) {
                const target = this.toPick as Circle;

                // the angle of the pick point
                let angle = math.atan2(pt.y - target.c.y, pt.x - target.c.x);
                if (angle < 0) angle += 2 * Math.PI;

                const results: Array<IIntersectPoint> = [];

                const candidates = this.activeLayer.objects;
                for (let candidate of candidates) {
                    const item = candidate as SketchObject;
                    if (item.nodeId === target.nodeId) continue;

                    if (item.class === SEGMENT) {
                        let tess = item.tessellation();
                        const ans = lineCircleValidation(tess[0].x, tess[0].y, tess[1].x, tess[1].y,
                            target.c.x, target.c.y, target.r);
                        if (ans.status === INTERSECTION) {
                            let delta = math.atan2(ans.point!.y - target.c.y, ans.point!.x - target.c.x);
                            if (delta < 0) delta += 2 * Math.PI;
                            results.push({
                                tool: candidate as SketchObject,
                                pt: ans.point!,
                                u: ans.params!.t,
                                side: delta
                            })
                        } else if (ans.status === MULTIPLE_INTERSECTION) {
                            let delta1 = math.atan2(ans.point1!.y - target.c.y, ans.point1!.x - target.c.x);
                            if (delta1 < 0) delta1 += 2 * Math.PI;
                            const p1 = {
                                tool: candidate as SketchObject,
                                pt: ans.point1!,
                                u: ans.params!.t,
                                side: delta1
                            };
                            let delta2 = math.atan2(ans.point2!.y - target.c.y, ans.point2!.x - target.c.x);
                            if (delta2 < 0) delta2 += 2 * Math.PI;
                            const p2 = {
                                tool: candidate as SketchObject,
                                pt: ans.point2!,
                                u: ans.params!.q!,
                                side: delta2
                            };
                            results.push(p1, p2);
                        }
                    }
                }

                const [start, end] = TrimTool.findCircleEnds(results, angle);
                if (start && end) {
                    const tp1 = new EndPoint(start.pt.x, start.pt.y);
                    const tp2 = new EndPoint(end.pt.x, end.pt.y);
                    const arc = new Arc(SM_edit(target.c), tp2, tp1, target.r);
                    this.addAndConsumeByCommand([arc], [target]);

                    if (start.tool.class === SEGMENT) {
                        this.viewer.constraintManager.pointOnLine(tp1, start.tool as Segment);
                    }

                    if (end.tool.class === SEGMENT) {
                        this.viewer.constraintManager.pointOnLine(tp2, end.tool as Segment);
                    }
                } else {
                    this.removeObjectsByCommand([this.toPick as SketchObject]);
                }
            } else {
                this.removeObjectsByCommand([this.toPick as SketchObject]);
            }
        }
    }

    static findLineEnds(results: Array<IIntersectPoint>) {
        results.sort((a, b) => {
            return a.u - b.u;
        });
        // find the start and end
        const end = results.find((item) => {
            return item.side === LEFTSIDE;
        });
        results.reverse();
        const start = results.find((item) => {
            return item.side === RIGHTSIDE;
        });

        return [start, end];
    }

    static findCircleEnds(results: Array<IIntersectPoint>, ref: number) {
        if (results.length < 2) return [undefined, undefined];
        // sort from small to large
        results.sort((a, b) => {
            return a.side - b.side;
        });
        // try to compare the results with the ref
        let startIndex = -1, n = results.length;
        for (let i = 0; i < n; ++i) {
            const cur = results[i].side;
            if (cur < ref) {
                startIndex = i;
            }
        }

        return [results[(n + startIndex) % n], results[(startIndex + 1) % n]];
    }
}
