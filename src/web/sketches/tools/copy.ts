import Sketcher from "@/web/sketches/sketcher";
import AbstractPickTool from "@/web/sketches/tools/pick";
import DragTool from "@/web/sketches/tools/drag";
import SketchObject from "@/web/sketches/shapes/object";


export default class CopyTool extends AbstractPickTool {

    constructor(viewer: Sketcher) {
        super(viewer, 'copy');
        this.cursorStyle = 'grabbing';
    }

    restart() {
        this.sendHint('Sketch: select object(s) to copy.')
    }

    mousemove(e: MouseEvent) {
        let p = this.viewer.screenToModel(e);
        this.viewer.snap(p.x, p.y, [], false, true);
    }

    pickImpl(e: MouseEvent) {
        super.pickImpl(e);
        const toPick = this.toPick as SketchObject;
        if (this.toPick && !toPick.readOnly) {
            const copied = toPick.copy();
            this.addObjectsByCommand([copied]);
            // drag now
            this.deputyTool = new DragTool(this.viewer, copied);
            this.deputyTool.mousedown(e);
            this.viewer.toolManager.switchTool(this.deputyTool);
        }
    }

    mouseup(e: MouseEvent): void {
    }
}
