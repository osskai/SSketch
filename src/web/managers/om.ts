import {syslog} from "@/web/syslog";
import {ERROR_ALLOCATE, ERROR_FREE} from "@/web/errors";

/**
 * the tag object class
 */
export default class TaggedObject {

    static CREATED = 0;
    static MODIFY = 1;
    static DELETED = 2;

    protected _nodeId: number;
    protected __class: string;

    protected _status: number;

    constructor(id: number = 0) {
        this._nodeId = id;
        this.__class = 'root';
        this._status = TaggedObject.CREATED;
    }

    get info(): any {
        return [this._nodeId, this.__class];
    }

    get baseInfo(): any {
        return [this._nodeId, this.__class];
    }

    set nodeId(value: number) {
        this._nodeId = value;
    }

    get nodeId() {
        return this._nodeId;
    }

    get class() {
        return this.__class;
    }

    set status(value: number) {
        this._status = value;
    }

    get status() {
        return this._status;
    }

    can_delete(): boolean {
        return true;
    }

    is_deleted(): boolean {
        return this._status === TaggedObject.DELETED;
    }
}


/**
 * global object manager
 */
class ObjectManager {

    private readonly objects: Array<TaggedObject>;

    private currentId: number;
    private freeObjectsIds: Array<number>;

    constructor() {
        this.objects = [];

        this.currentId = 1;
        this.freeObjectsIds = [];
    }

    get entries() {
        return this.objects;
    }

    dispose() {
        this.currentId = 1;
        this.freeObjectsIds = [];
    }

    computeNextAvailableObjectId() {
        let objectId = 0;
        if (this.freeObjectsIds.length != 0) {
            objectId = <number>this.freeObjectsIds.pop();
        } else {
            objectId = this.currentId;
            this.currentId++;
        }

        return objectId;
    }

    addObject(object: TaggedObject, id?: number) {
        if (id === undefined) {
            object.nodeId = this.computeNextAvailableObjectId();
        } else {
            object.nodeId = id;
            // update the currentId
            this.currentId = id + 1;
        }
        object.status = TaggedObject.CREATED;
        this.objects.push(object);
    }

    removeObject(object: TaggedObject) {
        const index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
            this.freeObjectsIds.push(object.nodeId);
        }
        object.nodeId = 0;
    }
}

/**
 * global variables to manage the object node id
 */
const globalObjectManager = new ObjectManager();

export function OM_ask_pointer_of_tag(entity: number) {
    for (const item of globalObjectManager.entries) {
        if (item.nodeId === entity) {
            return item;
        }
    }

    return null;
}

export function OM_ask_objects_count(type: string) {
    let results: Set<TaggedObject> = new Set<TaggedObject>();
    globalObjectManager.entries.forEach((object) => {
        if (object.class.indexOf(type) !== -1) {
            results.add(object);
        }
    });

    return results;
}

/**
 * allocate an space for the object
 * @param object
 * @param id
 */
export function SM_alloc(object: any, id?: number) {
    try {
        if (object === null) {
            syslog.raise_error('cannot allocate space for null target', ERROR_ALLOCATE);
        }
    } catch (e) {
        syslog.fatal('please report the issue');
        return;
    }
    globalObjectManager.addObject(object, id);
    if (id !== undefined) {
        syslog.info(`add ${object.class} with ${object.nodeId}`);
    } else {
        syslog.info(`allocate ${object.nodeId} for ${object.class}`);
    }

    return object;
}

export function SM_edit(object: any) {
    object.status = TaggedObject.MODIFY;
    return object;
}

/**
 * free the space for the object
 * @param object
 * @constructor
 */
export function SM_free(object: TaggedObject) {
    try {
        if (object.nodeId <= 0) {
            syslog.raise_error(`free undefined object ${object.class}`, ERROR_FREE, object);
        }
        syslog.info(`free ${object.class}, and recycle ${object.nodeId}`);
        globalObjectManager.removeObject(object);
        object.status = TaggedObject.DELETED;
    } catch (e) {
        syslog.error('free space failed');
    }
}

export function SM_dispose() {
    globalObjectManager.dispose();
}
