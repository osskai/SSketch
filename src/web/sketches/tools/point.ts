import BaseTool from "@/web/sketches/tools/tool";
import Sketcher from "@/web/sketches/sketcher";
import Vector from "@/web/math/vector";
import EndPoint from "@/web/sketches/shapes/point";


/**
 * Point Tool
 */
export default class PointTool extends BaseTool {

    constructor(viewer: Sketcher) {
        super(viewer, 'point');
    }

    restart() {
        this.sendHint('Sketch: specify point.');
    }

    mouseup(e: MouseEvent) {
        super.mouseup(e);
        if (!this.isButtonValid) return;

        const input = this.viewer.screenToModel(e);
        this.processPointInput(input);
    }

    processPointInput(input: Vector) {
        const p = new EndPoint(input.x, input.y);
        this.addObjectsByCommand([p]);
        this.pointPicked(p.x, p.y);

        this.restart();
    }

}
