import Sketcher from "@/web/sketches/sketcher";
import GetShapeEditTool from "@/web/sketches/tools/editmap";
import AbstractPickTool from "@/web/sketches/tools/pick";
import SketchObject from "@/web/sketches/shapes/object";


class BasePanTool extends AbstractPickTool {

    protected deselectOnUp: boolean;

    constructor(viewer: Sketcher) {
        super(viewer, 'pan');
        this.cursorStyle = 'grab';
        this.deselectOnUp = false;
    }

    pickImpl(e: MouseEvent) {
        super.pickImpl(e);
        const toPick = this.toPick as SketchObject;
        if (this.toPick && !toPick.readOnly) {
            this.deputyTool = GetShapeEditTool(this.viewer, toPick, e.altKey);
            this.deputyTool.mousedown(e);
            this.viewer.toolManager.switchTool(this.deputyTool);
        }
    }

    startDragging(e: MouseEvent) {
    }

    dblclick(e: MouseEvent) {
        if (this.deputyTool !== null) {
            this.deputyTool.dblclick(e);
        }
    }
}


/**
 *
 */
export default class PanTool extends BasePanTool {

    private dragging: boolean;
    private x: number;
    private y: number;

    constructor(viewer: Sketcher) {
        super(viewer);

        this.dragging = false;
        this.x = 0.0;
        this.y = 0.0;
    }

    restart() {
        this.sendHint('Sketch: pan the canvas.');
    }

    mousedown(e: MouseEvent) {
        super.mousedown(e);
    }

    mousemove(e: MouseEvent) {
        if (!this.dragging) {
            let hovered = this.viewer.pick(e);
            if (hovered.length > 0) {
                //@ts-ignore
                this.viewer.highlight([hovered[0]], true);
            } else {
                this.viewer.unHighlight();
            }
            return;
        }
        let dx = e.pageX - this.x;
        let dy = e.pageY - this.y;
        dy *= -1;

        this.viewer.translate.x += dx;
        this.viewer.translate.y += dy;

        this.x = e.pageX;
        this.y = e.pageY;
        this.deselectOnUp = false;

        this.viewer.refresh();
    }

    startDragging(e: MouseEvent) {
        super.startDragging(e);
        this.deselectOnUp = true;
        if (e.button !== 2) return;

        this.dragging = true;
        this.x = e.pageX;
        this.y = e.pageY;
    }

    mouseup(e: MouseEvent) {
        super.mouseup(e);
        this.dragging = false;
        if (this.deselectOnUp) {
            this.viewer.deselectAll();
            this.sendMessage('');
        }
        this.deselectOnUp = false;
    }

}


/**
 *
 */
export class DelegatingPanTool extends BasePanTool{

    private delegate: HTMLElement;

    constructor(viewer: Sketcher, delegate: HTMLElement) {
        super(viewer);

        this.delegate = delegate;
    }


    startDragging(e: MouseEvent) {
        this.delegate.dispatchEvent(new Event(e.type));
    }

    mouseup(e: MouseEvent) {
        this.delegate.dispatchEvent(new Event(e.type));
    }
}
