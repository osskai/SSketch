import Sketcher from "@/web/sketches/sketcher";
import SketchObject from "@/web/sketches/shapes/object";
import Circle from "@/web/sketches/shapes/circle";
import CircleTool from "@/web/sketches/tools/circle";
import DragTool from "@/web/sketches/tools/drag";


export default function GetShapeEditTool(viewer: Sketcher, obj: SketchObject, alternative: boolean) {
    if (obj instanceof Circle && !alternative) {
        return new CircleTool(viewer, obj);
    }

    return new DragTool(viewer, obj);
}
