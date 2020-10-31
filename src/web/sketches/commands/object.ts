import Command from "@/web/sketches/commands/command";
import SketchObject from "@/web/sketches/shapes/object";
import Sketcher from "@/web/sketches/sketcher";
import Tool from "@/web/sketches/tools/tool";
import {deepCopyArray} from "@/web/utils";


export class AddObjectCommand extends Command {

    private readonly objects: Array<SketchObject>;
    private readonly tool: Tool;

    private readonly parent: SketchObject | undefined;
    private readonly index: number | undefined;

    constructor(viewer: Sketcher, objects: Array<SketchObject>, parent?: SketchObject, index?: number) {
        super(viewer);

        this.objects = objects;
        this.parent = parent;
        if (parent !== undefined) {
            let i = 0;
            for (; i < parent.children.length; ++i) {
                if (parent.children[i].nodeId === objects[0].nodeId) {
                    this.index = i;
                    break;
                }
            }
            if (i === parent.children.length) {
                this.index = index;
            }
        }

        this.tool = this.viewer.toolManager.currentTool;

        this.__class = "Command.AddObject";
    }

    execute(): void {
        this.tool.addSketchObjects(this.objects, this.parent, this.index);
    }

    undo(): void {
        const objects = deepCopyArray(this.objects);
        this.tool.removeSketchObjects(objects.reverse(), this.parent, this.index);
    }

}

export class RemoveObjectCommand extends Command {

    private readonly objects: Array<SketchObject>;
    private readonly tool: Tool;

    private readonly parent: SketchObject | undefined;
    private readonly index: number | undefined;

    constructor(viewer: Sketcher, objects: Array<SketchObject>, parent?: SketchObject) {
        super(viewer);

        this.objects = objects;

        this.parent = parent;
        if (this.parent !== undefined) {
            for (let i = 0; i < this.parent.children.length; ++i) {
                if (this.parent.children[i].nodeId === objects[0].nodeId) {
                    this.index = i;
                    break;
                }
            }
        }

        this.tool = this.viewer.toolManager.currentTool;

        this.__class = "Command.RemoveObject";
    }

    execute(): void {
        this.tool.removeSketchObjects(this.objects, this.parent, this.index);
    }

    undo(): void {
        const objects = deepCopyArray(this.objects);
        this.tool.addSketchObjects(objects, this.parent, this.index);
    }

}


export interface IUpdateObjectCommandParams {
    params: any;
}

export class UpdateObjectCommand extends Command {

    private readonly object: SketchObject;
    private readonly tool: Tool;

    private readonly newParams: IUpdateObjectCommandParams;
    private readonly oldParams: IUpdateObjectCommandParams;

    private hasUpdatable: boolean;

    constructor(viewer: Sketcher, object: SketchObject,
                newP: IUpdateObjectCommandParams, oldP: IUpdateObjectCommandParams,
                hasUpdatable = true) {
        super(viewer);

        this.object = object;

        this.updatable = true;
        this.id = object.nodeId;

        this.newParams = newP;
        this.oldParams = oldP;

        this.hasUpdatable = hasUpdatable;

        this.tool = this.viewer.toolManager.currentTool;

        this.__class = "Command.UpdateObject";
    }

    execute(): void {
        this.tool.updateSketchObject(this.object, this.newParams, this.oldParams, this.hasUpdatable);
    }

    undo(): void {
        this.hasUpdatable = false;
        this.tool.updateSketchObject(this.object, this.oldParams, this.newParams, this.hasUpdatable);
    }

    update(cmd: Command): void {
        this.hasUpdatable = true;
        this.newParams.params = (cmd as UpdateObjectCommand).newParams.params;
    }

}

