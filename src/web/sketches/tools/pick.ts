import BaseTool from "@/web/sketches/tools/tool";
import Sketcher from "@/web/sketches/sketcher";
import SketchObject from "@/web/sketches/shapes/object";
import SketchShape from "@/web/sketches/shape";
import ConstraintObject from "@/web/sketches/constraints/shapes/object";
import Dimension from "@/web/sketches/shapes/dim";


export default class AbstractPickTool extends BaseTool {

    protected toPick: SketchShape | null;
    protected deputyTool: BaseTool | null;
    protected deselectOnUp: boolean;

    constructor(viewer: Sketcher, name: string) {
        super(viewer, name);
        this.toPick = null;
        this.deputyTool = null;
        this.deselectOnUp = false;
    }

    mousedown(e: MouseEvent) {
        super.mousedown(e);
        if (e.button === 0) {
            let picked = this.viewer.pick(e);
            if (picked.length > 0) {
                this.toPick = picked[0];
                // enable multiple selection by default
                if (1) {
                    let ids = this.viewer.selected.map(function (s: any) {
                        return s.id;
                    });
                    for (let i = 0; i < picked.length; i++) {
                        if (ids.indexOf(picked[i].nodeId) !== -1) {
                            this.viewer.deselect(picked[i]);
                        } else {
                            this.toPick = picked[i];
                        }
                    }
                    this.viewer.select([this.toPick], false);
                    this.deselectOnUp = false;
                } else {
                    if (this.viewer.selected.length === 1) {
                        for (let i = 0; i < picked.length - 1; i++) {
                            if (picked[i].nodeId === this.viewer.selected[0].nodeId) {
                                this.toPick = picked[i + 1];
                                break;
                            }
                        }
                    }
                    this.viewer.select([this.toPick], true);
                }
                this.pickImpl(e);
                return;
            } else {
                this.deputyTool = null;
                this.toPick = null;
                this.viewer.deselectAll();
            }
        }
        this.startDragging(e);
    }

    pickImpl(e: MouseEvent) {
        const selected = this.viewer.selected;
        let str = '';
        for (let i = 0; i < selected.length - 1; ++i) {
            str += (selected[i].nodeId + ', ');
        }
        this.sendMessage('Object ' + str + this.toPick!.nodeId + ' is picked.');
    }

    startDragging(e: MouseEvent) {
    }

    contextmenu(e: MouseEvent) {
        if (!this.isContextMenuClicked) return;
        super.contextmenu(e);
    }

    keydown(e: KeyboardEvent) {
        super.keydown(e);
        if (e.key === 'Delete') {
            this.removeObjectOrConstraint();
        }
    }

    removeObjectOrConstraint() {
        if (this.toPick !== null) {
            if (this.toPick.can_delete()) {
                if (this.toPick.class.indexOf('CSHAPE.') !== -1) {
                    const object = this.toPick as ConstraintObject;
                    this.viewer.constraintManager.removeConstraintsByCommand([object.constraint]);
                } else if (this.toPick.class.indexOf('SKETCH.') !== -1) {
                    const object = this.toPick as SketchObject;
                    if (object.parent !== null) {
                        this.removeObjectsByCommand([object], object.parent ? object.parent : undefined);
                    } else {
                        this.removeObjectAndConstraintByCommand([object]);
                    }
                } else {
                    const object = this.toPick as Dimension;
                    this.viewer.dimLayer.removeAndFree(object);
                }
            }
            this.toPick = null;
        }
    }
}
