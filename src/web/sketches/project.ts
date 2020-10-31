import Sketcher from "@/web/sketches/sketcher";

export const SKETCHER_STORAGE_PREFIX = "SKETCH.projects.";

export default class SketchProject {

    private viewer: Sketcher;
    private _id: number;
    private _name: string;

    constructor(viewer: Sketcher) {
        this.viewer = viewer;
        this._id = 0;
        this._name = '_untitled';
        this.loadFromLocalStorage();
    }

    get name() {
        return this._name.replace(SKETCHER_STORAGE_PREFIX, '');
    }

    isSketchExists(name: string) {
        return localStorage.getItem(SKETCHER_STORAGE_PREFIX + name) !== null;
    }

    newSketch() {
        this._nameSketch();
        this.viewer.clear();
    }

    _nameSketch() {
        let name = prompt("Name for new sketch: ", 'sketch_' + this._id);
        if (name !== null) {
            if (this.isSketchExists(name)) {
                alert("Sorry, a sketch with the name '" + name + "' already exists. Won't override it.");
                return;
            }
            alert("it will remove the current sketch");
            ++this._id;
            this._name = SKETCHER_STORAGE_PREFIX + name;
        }
    }

    saveSketch() {
        if (this._name === '_untitled') {
            this._nameSketch();
        }
        const sketchData = this.viewer.io.serializeSketch('');
        localStorage.setItem(this._name, sketchData);
    }

    loadFromLocalStorage() {
        const sketchId = this.getSketchId();
        if (sketchId !== null) {
            let sketchData = localStorage.getItem(sketchId);
            if (sketchData !== null) {
                this.viewer.io.loadSketch(sketchData);
            }
            this.viewer.refresh();
        }
    }

    getSketchId() {
        for (let i = 0; i < localStorage.length; ++i) {
            const key = localStorage.key(i);
            if (key && key.indexOf(SKETCHER_STORAGE_PREFIX) !== -1) {
                this._name = key;
                return key;
            }
        }
        return null;
    }

    dispose() {
        localStorage.removeItem(this._name);
    }

}
