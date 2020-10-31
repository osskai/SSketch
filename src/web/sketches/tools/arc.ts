import BaseTool from "@/web/sketches/tools/tool";
import Arc from "@/web/sketches/shapes/arc";
import Sketcher from "@/web/sketches/sketcher";
import EndPoint from "@/web/sketches/shapes/point";

const math = require('mathjs');

export default class ArcTool extends BaseTool {

    private arc: Arc | null;

    constructor(viewer: Sketcher, arc: Arc | null = null) {
        super(viewer, 'arc');
        this.arc = arc;
    }

    restart() {
        this.arc = null;
        this.sendHint('Sketch: specify arc start point');
    }

    mousemove(e: MouseEvent) {
        const p = this.viewer.screenToModel(e);
        if (this.arc !== null) {
            this.arc.b.setFromPoint(p);
            this.demoCenter();

            this.viewer.snap(p.x, p.y, [this.arc.a, this.arc.b, this.arc.c]);
        } else {
            this.viewer.snap(p.x, p.y, []);
        }
    }

    mouseup(e: MouseEvent) {
        if (this.arc === null) {
            const a = this.viewer.screenToModel(e);
            this.createArcStep(a);
        } else {
            this.snapIfNeed(this.arc.b);
            this.finishStep();
        }
    }

    createArcStep(p: any) {
        this.arc = new Arc(
            new EndPoint(p.x, p.y),
            new EndPoint(p.x, p.y),
            new EndPoint(p.x, p.y)
        );
        this.addObjectsByCommand([this.arc]);
        this.snapIfNeed(this.arc.a);

        this.pointPicked(p.x, p.y);
        this.sendHint('Sketch: specify arc end point');
    }

    finishStep() {
        this.pointPicked(this.arc!.b.x, this.arc!.b.y);
        this.restart();
    }

    demoCenter() {
        const vab = this.arc!.b.toVector().minus(this.arc!.a.toVector())._divide(2);
        const eabt = vab.rotateZ(Math.PI / 2)._normalize();

        const r = this.arc!.r;
        const dis = r * r - vab.lengthSquared();

        const des = this.arc!.a.toVector().plus(vab)._plus(eabt._multiply(math.sqrt(dis)));
        this.arc!.c.setFromPoint(des);

        this.viewer.refresh();
    }

}
