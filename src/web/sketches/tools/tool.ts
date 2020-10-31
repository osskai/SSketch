import EndPoint, {BrushPoint} from "@/web/sketches/shapes/point";
import Sketcher from "@/web/sketches/sketcher";
import Layer from "@/web/sketches/layer";
import SketchObject, {BRUSH, CIRCLE, ENDPOINT, SEGMENT} from "@/web/sketches/shapes/object";
import TaggedObject, {SM_alloc, SM_free} from "@/web/managers/om";
import Vector from "@/web/math/vector";
import {AddObjectCommand, IUpdateObjectCommandParams, RemoveObjectCommand} from "@/web/sketches/commands/object";
import Segment from "@/web/sketches/shapes/segment";
import Circle from "@/web/sketches/shapes/circle";
import Brushes from "@/web/sketches/shapes/brush";
import Constraint from "@/web/sketches/constraints/constraint";
import {RemoveConstraintCommand} from "@/web/sketches/commands/constraint";


/**
 * abstract base class
 */
abstract class BaseTool {

    public ToolName: string;
    public cursorStyle: string;

    protected isButtonValid: boolean;

    protected viewer: Sketcher;
    protected activeLayer: Layer;

    private downMousePosition: Vector;
    protected isContextMenuClicked: boolean;
    protected contextEl: HTMLElement | null;

    protected constructor(viewer: Sketcher, name: string) {
        this.viewer = viewer;
        this.ToolName = name;
        this.cursorStyle = 'crosshair';
        this.isButtonValid = true;
        this.activeLayer = viewer.activeLayer;

        this.downMousePosition = new Vector();
        this.isContextMenuClicked = false;
        this.contextEl = null;
    }

    protected addObjectsByCommand(objs: Array<SketchObject>, parent?: SketchObject, index?: number) {
        this.viewer.execute(new AddObjectCommand(this.viewer, objs, parent, index));
    }

    protected addAndConsumeByCommand(added: Array<SketchObject>, consumed: Array<SketchObject>) {
        const addCommand = new AddObjectCommand(this.viewer, added);
        const removeCommand = new RemoveObjectCommand(this.viewer, consumed);
        this.viewer.transactionExecute([removeCommand, addCommand]);
    }

    protected removeObjectsByCommand(objs: Array<SketchObject>, parent?: SketchObject) {
        this.viewer.execute(new RemoveObjectCommand(this.viewer, objs, parent));
    }

    protected removeObjectAndConstraintByCommand(objs: Array<SketchObject>) {
        const objectCommand = new RemoveObjectCommand(this.viewer, objs);
        const constraints: Array<Constraint> = [];
        objs.forEach((obj) => {
            constraints.push(...obj.constraints);
        });
        const constraintCommand = new RemoveConstraintCommand(this.viewer, constraints);
        this.viewer.transactionExecute([constraintCommand, objectCommand]);
    }

    /**
     * add the sketch objects
     * @param objs
     * @param parent
     * @param index
     */
    addSketchObjects(objs: Array<SketchObject>, parent?: SketchObject, index?: number) {
        objs.forEach((obj) => {
            this.activeLayer.addAndAllocate(obj);
            // update the relations
            obj.updateRelations();
        });

        // add the obj to the index
        if (parent !== undefined && index !== undefined) {
            parent.children.splice(index, 0, objs[0]);
        }

        this.viewer.refresh();
    }

    /**
     * remove the sketch objects
     * @param objs
     * @param parent
     * @param index
     */
    removeSketchObjects(objs: Array<SketchObject>, parent?: SketchObject, index?: number) {
        objs.forEach((obj) => {
            this.viewer.removeObjectConstraint(obj);
            obj.removeDim(this.viewer.dimLayer);
            this.activeLayer.removeAndFree(obj);
        });

        // removed from its parents only for the first objs
        if (parent !== undefined && index !== undefined) {
            parent.children.splice(index, 1);
        }

        this.viewer.refresh();
        this.cleanup();
    }

    /**
     *
     * @param obj
     * @param newP
     * @param oldP
     * @param hasUpdatable
     */
    updateSketchObject(obj: SketchObject, newP: IUpdateObjectCommandParams, oldP: IUpdateObjectCommandParams,
                       hasUpdatable: boolean) {
        if (hasUpdatable) return;

        if (obj.class === ENDPOINT) {
            const point = obj as EndPoint;
            point.updateParams(newP.params.pt);
        } else if (obj.class === SEGMENT) {
            const line = obj as Segment;
            const dir = newP.params.pt.minus(oldP.params.pt);
            line.a.updateParams(line.a.toVector()._plus(dir));
            line.b.updateParams(line.b.toVector()._plus(dir));
        } else if (obj.class === CIRCLE) {
            const circle = obj as Circle;
            circle.r = newP.params.r;
        } else if (obj.class === BRUSH) {
            const brush = obj as Brushes;
            const dir = newP.params.pt.minus(oldP.params.pt);
            brush.children.forEach((child: SketchObject) => {
                const item = child as BrushPoint;
                item.updateParams(item.toVector()._plus(dir));
            });
        }

        this.viewer.refresh();
    }

    restart() {
    };

    cleanup() {
    };

    mousedown(e: MouseEvent) {
        this.isButtonValid = (e.button === 0);
        // use the middle button to release the control
        if (e.button === 1) {
            this.viewer.toolManager.releaseControl();
        } else if (e.button === 2) {
            this.downMousePosition.setFromXYZ(e.clientX, e.clientY);
        }
    }

    mousemove(e: MouseEvent) {
    }

    mouseup(e: MouseEvent) {
        this.isButtonValid = (e.button === 0);
        const upMousePosition = new Vector(e.clientX, e.clientY);
        this.isContextMenuClicked = this.downMousePosition.distanceTo(upMousePosition) < 10;
    }

    snapIfNeed(p: EndPoint) {
        if (this.viewer.snapped !== null) {
            const snapped = this.viewer.snapped;
            this.viewer.cleanSnap();

            p.setFromPoint(snapped);
            this.viewer.constraintManager.coincidePoints(<EndPoint>snapped, p);
        }
    }

    dblclick(e: MouseEvent) {
    }

    contextmenu(e: MouseEvent) {
    }

    sendMessage(text: string) {
        this.viewer.streams.tool.$message.next(text);
    };

    sendHint(hint: string) {
        this.viewer.streams.tool.$hint.next(hint);
    };

    pointPicked(x: number, y: number) {
        this.sendMessage('picked: ' + this.viewer.roundToPrecision(x) + " , " + this.viewer.roundToPrecision(y));
    };

    static dumbMode(e: MouseEvent) {
        return e.ctrlKey || e.metaKey || e.altKey;
    }

    keydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            this.viewer.toolManager.releaseControl();
            this.viewer.deselectAll();
            this.viewer.unHighlight();
        }
    }

    /**
     * command lines to execute the tool
     */
    static ParseNumber(str: string) {
        let val;
        try {
            val = eval(str);
        } catch (e) {
            return e.toString();
        }
        let valNumber = parseFloat(val);
        if (isNaN(valNumber)) return "wrong input for number: " + str;
        return valNumber;
    }

    static ParseNumberWithRef(str: string, ref?: string) {
        const rel = str.startsWith('@');
        if (rel) {
            str = str.substring(1);
        }
        let val = BaseTool.ParseNumber(str);
        if (typeof val === 'string') return val;
        if (rel !== undefined) {
            val += ref;
        }
        return val;
    }

    static ParseVector(referencePoint: EndPoint, command: string) {
        command = command.replace(/\s+/g, '');

        const match = command.match(VECTOR_PATTERN);
        if (match) {
            const ref = match[1] !== undefined;
            let x = BaseTool.ParseNumber(match[2]);
            if (typeof x === 'string') return x;
            const polar = match[3] == '<';
            let y = BaseTool.ParseNumber(match[4]);
            if (typeof y === 'string') return y;
            if (polar) {
                const angle = y / 180 * Math.PI;
                const radius = x;
                x = radius * Math.cos(angle);
                y = radius * Math.sin(angle);
            }
            if (ref) {
                x += referencePoint.x;
                y += referencePoint.y;
            }
            return {x, y};
        }

        return "wrong input, point is expected: x,y | @x,y | r<polar | @r<polar ";
    }

    static ParseNumberSequence(command: string, refs: string, length: number) {
        command = command.replace(/\s+/g, '');
        const parts = command.split(',');
        const result = [];
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            let val = refs && refs[i] ? BaseTool.ParseNumberWithRef(part, refs[i]) : BaseTool.ParseNumberWithRef(part);
            result.push(val);
        }
        if (length !== undefined && result.length != length) {
            return "wrong input, sequence of length " + length + " is expected: x1,x2...";
        }
        return result;
    }
}

const VECTOR_PATTERN = /^(@)?(.+)(,|<)(.+)$/;

export default BaseTool;

export const POINTTOOL = 'point';
export const LINETOOL = 'line';
export const RECTANGLETOOL = 'rectangle';
export const CIRCLETOOL = 'circle';
export const ARCTOOL = 'arc';
export const BRUSHTOOL = 'brushes';
export const SPLINETOOL = 'spline';
export const TRIMTOOL = 'trim';
export const DRAGTOOL = 'drag';
export const PANTOOL = 'pan';
export const COPYTOOL = 'copy';

export const MEASURETOOL = 'measure';
export const CHECKTOOL = 'check';
