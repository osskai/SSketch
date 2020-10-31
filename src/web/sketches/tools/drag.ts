import BaseTool from "@/web/sketches/tools/tool";
import SketchObject, {LINEAR_DIMENSION} from "@/web/sketches/shapes/object";
import Vector from "@/web/math/vector";
import Sketcher from "@/web/sketches/sketcher";
import {UpdateObjectCommand} from "@/web/sketches/commands/object";
import {LinearDimension} from "@/web/sketches/shapes/dim";
import ConstraintManager from "@/web/sketches/constraints/manager";

const math = require('mathjs');

export default class DragTool extends BaseTool {

    private readonly obj: SketchObject;
    private _point: Vector;
    private origin: Vector;

    private readonly cm: ConstraintManager;
    private enableDrag: boolean;

    constructor(viewer: Sketcher, obj: SketchObject) {
        super(viewer, 'drag');
        this.cursorStyle = 'move';

        this.obj = obj;
        this._point = new Vector();
        this.origin = new Vector();

        this.cm = this.viewer.constraintManager;
        this.enableDrag = true;
    }

    restart() {
        this.sendHint('Sketch: dragging the object(s).');
    }

    mousemove(e: MouseEvent) {
        if (this.enableDrag) {
            // before
            let x = this._point.x;
            let y = this._point.y;
            // after
            this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
            let dx = this._point.x - x;
            let dy = this._point.y - y;
            this.obj.translate(dx, dy);
        }

        if (!BaseTool.dumbMode(e) && this.obj.constraintExist) {
            this.cm.solve(true);
            this.enableDrag = !this.cm.isLocked;
        }

        this.viewer.refresh();
    }

    mousedown(e: MouseEvent) {
        this.origin = this.viewer.screenToModel(e);
        this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
        if (this.obj.constraintExist) {
            this.cm.prepare(this.obj, this.cm.isLocked);
        }
    }

    mouseup(e: MouseEvent) {
        super.mouseup(e);

        if (!this.cm.isLocked) {
            this._point = this.viewer.screenToModel(e);
            if (this._point.distanceTo(this.origin) > 20 && this.obj.isSketchObject()) {
                this.viewer.execute(new UpdateObjectCommand(this.viewer, this.obj,
                    {
                        params: {pt: this._point}
                    },
                    {
                        params: {pt: this.origin}
                    }));
            }
            if (this.obj.constraintExist) {
                this.cm.solve(false);
            }
        }

        this.viewer.toolManager.switchToolBack();
    }

}


export class DragDimensionTool extends BaseTool {

    private readonly obj: LinearDimension;
    private _point: Vector;
    private sumDx: number;
    private sumDy: number;

    constructor(viewer: Sketcher, obj: any) {
        super(viewer, 'drag dim');
        this.cursorStyle = 'move';

        this.obj = obj;
        this._point = new Vector();

        this.sumDx = 0;
        this.sumDy = 0;
    }

    restart() {
        this.sendHint('Sketch: dragging the dimension.');
    }

    mousemove(e: MouseEvent) {
        // before
        let x = this._point.x;
        let y = this._point.y;
        // after
        this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
        let dx = this._point.x - x;
        let dy = this._point.y - y;
        this.obj.translate(dx, dy);

        // check the drag direction
        if (this.obj.class === LINEAR_DIMENSION) {
            this.sumDx += dx;
            this.sumDy += dy;
            const delta = math.abs(this.sumDy) - math.abs(this.sumDx);
            if (delta > 50) {
                this.obj.alignB = {x: this.obj.a.x, y: this.obj.b.y};
            } else if (delta < -50) {
                this.obj.alignB = {x: this.obj.b.x, y: this.obj.a.y};
            } else {
                this.obj.alignB = {x: this.obj.b.x, y: this.obj.b.y};
            }
        }

        this.viewer.refresh();
    }

    mousedown(e: MouseEvent) {
        this.sumDx = 0;
        this.sumDy = 0;
        this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
    }

    mouseup(e: MouseEvent) {
        super.mouseup(e);
        this.viewer.unHighlight();
        this.viewer.toolManager.switchToolBack();
    }

}
