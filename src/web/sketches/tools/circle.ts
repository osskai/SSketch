import BaseTool from "@/web/sketches/tools/tool";
import Circle from "@/web/sketches/shapes/circle";
import Sketcher from "@/web/sketches/sketcher";
import {distance} from "@/web/math/vec";
import Vector from "@/web/math/vector";
import EndPoint from "@/web/sketches/shapes/point";
import {UpdateObjectCommand} from "@/web/sketches/commands/object";


export default class CircleTool extends BaseTool {

    private circle: Circle | null;
    private readonly dragMode: boolean;

    private oldRadius: number | undefined;

    constructor(viewer: Sketcher, circle: Circle | null = null) {
        super(viewer, 'circle');
        this.circle = circle;

        this.dragMode = this.circle !== null;
    }

    get isDragging() {
        return this.dragMode;
    }

    restart() {
        this.circle = null;
        this.sendHint('Sketch: specify the center');
    }

    cleanup() {
        this.viewer.cleanSnap();
    }

    mousedown(e: MouseEvent) {
        super.mousedown(e);
        if (!this.isButtonValid) return;

        if (this.circle !== null) {
            this.oldRadius = this.circle.r;
            if (this.circle.constraintExist) this.viewer.constraintManager.prepare(this.circle);
            this.sendHint('Sketch: drag the object(s).');
        }
    }

    mousemove(e: MouseEvent) {
        let p = this.viewer.screenToModel(e);
        if (this.circle !== null) {
            this.circle.r = distance([p.x, p.y], [this.circle.c.x, this.circle.c.y]);
            if (!BaseTool.dumbMode(e) && this.circle.constraintExist) {
                this.viewer.constraintManager.solve(true);
            }
        } else {
            this.viewer.snap(p.x, p.y, []);
        }
    }

    mouseup(e: MouseEvent) {
        if (!this.isButtonValid) return;

        if (this.circle === null) {
            this.stepCreateCircle(this.viewer.screenToModel(e), true);
        } else {
            this.stepFinish();
        }
    }

    stepCreateCircle(center: Vector, tryToSnap: boolean) {
        this.circle = new Circle(
            new EndPoint(center.x, center.y)
        );
        this.addObjectsByCommand([this.circle]);
        this.snapIfNeed(this.circle.c);

        this.pointPicked(center.x, center.y);
        this.sendHint('Sketch: specify the radius.');
    }

    stepFinish() {
        if (this.circle!.constraintExist) this.viewer.constraintManager.solve(false);
        this.sendMessage("radius: " + this.viewer.roundToPrecision(this.circle!.r));

        if (this.dragMode) {
            const dragged = this.circle as Circle;
            this.viewer.execute(new UpdateObjectCommand(this.viewer, dragged,
                {
                    params: {r: dragged.r}
                },
                {
                    params: {r: this.oldRadius}
                }));
            this.viewer.toolManager.releaseControl();
        } else {
            this.restart();
        }
    }
}
