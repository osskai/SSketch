import Sketcher from "@/web/sketches/sketcher";
import Tool, {
    ARCTOOL,
    BRUSHTOOL, CHECKTOOL,
    CIRCLETOOL,
    COPYTOOL,
    LINETOOL, MEASURETOOL,
    POINTTOOL, RECTANGLETOOL,
    SPLINETOOL,
    TRIMTOOL
} from "@/web/sketches/tools/tool";
import Emitter from "@/web/stream/emitter";
import PointTool from "@/web/sketches/tools/point";
import SegmentTool from "@/web/sketches/tools/segment";
import CircleTool from "@/web/sketches/tools/circle";
import SplineTool from "@/web/sketches/tools/spline";
import BrushTool from "@/web/sketches/tools/brush";
import TrimTool from "@/web/sketches/tools/trim";
import CopyTool from "@/web/sketches/tools/copy";
import RectangleTool from "@/web/sketches/tools/rectangle";
import DragTool from "@/web/sketches/tools/drag";
import ArcTool from "@/web/sketches/tools/arc";
import MeasureTool from "@/web/sketches/tools/dim";


/**
 *
 */
export default class ToolManager {

    private viewer: Sketcher;
    private defaultTool: Tool;
    private tool: Tool;
    private lastTool: Tool | null;
    private disposers: Array<Function>;

    constructor(viewer: Sketcher, defaultTool: Tool) {
        this.viewer = viewer;
        this.defaultTool = defaultTool;
        this.tool = defaultTool;
        this.lastTool = null;

        this.disposers = [];

        const canvas = <HTMLCanvasElement>viewer.canvas;
        this.addEventListener(canvas,'mousemove', (e: MouseEvent) => {
            e.preventDefault();
            //e.stopPropagation(); // allow propagation for move in sake of dynamic layout
            this.tool.mousemove(e);
        }, false);
        this.addEventListener(canvas,'mousedown', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.tool.mousedown(e);
        }, false);
        this.addEventListener(canvas,'mouseup', (e: MouseEvent) => {
            e.preventDefault();
            // e.stopPropagation(); // allow propagation for move in sake of dynamic layout
            this.tool.mouseup(e);
        }, false);
        this.addEventListener(canvas,'dblclick', (e: MouseEvent) => {
            e.preventDefault();
            this.tool.dblclick(e);
        }, false);
        this.addEventListener(canvas, 'wheel', (e: WheelEvent) => {
            e.stopPropagation();
            this.viewer.setScale(e.deltaY);
        }, false);
        this.addEventListener(canvas, 'contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            this.tool.contextmenu(e);
        }, false);
        this.addEventListener(window, "keydown", (e: KeyboardEvent) => {
            this.tool.keydown(e);
        }, false);
    }

    setDefaultTool(defaultTool: Tool) {
        this.defaultTool = defaultTool;
        this.tool = defaultTool;
    }

    get currentTool() {
        return this.tool;
    }

    addEventListener(subject: any, event: any, fn: Function, useCapture: any) {
        subject.addEventListener(event, fn, useCapture);
        this.disposers.push(() => subject.removeEventListener(event, fn, useCapture));
    }

    takeControl(tool: Tool) {
        this.tool.cleanup();
        this.switchTool(tool);
        this.tool.restart();
    }

    switchTool(tool: Tool) {
        this.lastTool = this.tool;
        this.tool = tool;
        this.viewer.streams.tool.$change.next(tool);
        if (this.tool instanceof DragTool) {
            this.tool.restart();
        }
    }

    switchToolBack(){
        if (this.lastTool !== null) {
            this.takeControl(this.lastTool);
        } else {
            this.releaseControl();
        }
    }

    releaseControl() {
        this.takeControl(this.defaultTool);
    }

    dispose() {
        this.disposers.forEach(d => d());
    }

    selectTool(action: string) {
        switch (action) {
            case POINTTOOL:
                this.viewer.toolManager.takeControl(new PointTool(this.viewer));
                break;
            case LINETOOL:
                this.viewer.toolManager.takeControl(new SegmentTool(this.viewer, true));
                break;
            case RECTANGLETOOL:
                this.viewer.toolManager.takeControl(new RectangleTool(this.viewer));
                break;
            case CIRCLETOOL:
                this.viewer.toolManager.takeControl(new CircleTool(this.viewer));
                break;
            case ARCTOOL:
                this.viewer.toolManager.takeControl(new ArcTool(this.viewer));
                break;
            case SPLINETOOL:
                this.viewer.toolManager.takeControl(new SplineTool(this.viewer));
                break;
            case BRUSHTOOL:
                this.viewer.toolManager.takeControl(new BrushTool(this.viewer));
                break;
            case TRIMTOOL:
                this.viewer.toolManager.takeControl(new TrimTool(this.viewer));
                break;
            case COPYTOOL:
                this.viewer.toolManager.takeControl(new CopyTool(this.viewer));
                break;

            case MEASURETOOL:
                this.viewer.toolManager.takeControl(new MeasureTool(this.viewer));
                break;
            case CHECKTOOL:
                this.viewer.checkWorld();
                break;
            default:
                break;
        }
    }
}

export interface ISketchToolStream {
    $change: Emitter,
    $message: Emitter,
    $hint: Emitter
}
