import {syslog} from "@/web/syslog";
import {ERROR_UNKNOWN} from "@/web/errors";

interface IdEntity {
    id: number,
    tag: number
    info: Array<any>
}

/**
 * Id list class, use this class to search the param, equations, and etc.
 */
export default class IdList<T extends IdEntity> {

    public elem: Array<T>;
    public n: number;

    constructor() {
        this.elem = [];
        this.n = 0;
    }

    addAndAssignId(t: T) {
        t.id = this.maximumId() + 1;
        this.add(t);

        return t.id;
    }

    has(t: T) {
        if (t.id === -1) return false;

        const ans = this._findById(t.id);
        return ans !== null;
    }

    private maximumId() {
        let id = 0;
        for (let i = 0; i < this.n; ++i) {
            id = Math.max(id, this.elem[i].id);
        }

        return id;
    }

    add(t: T) {
        let first = 0, last = this.n;
        try {
            while (first !== last) {
                const mid = Math.floor((first + last) / 2);
                const id = this.elem[mid].id;
                if (id > t.id) {
                    last = mid;
                } else if (id < t.id) {
                    first = mid + 1;
                } else {
                    syslog.raise_error("add fails", ERROR_UNKNOWN, t.info);
                }
            }
        } catch (e) {
            syslog.error('add object to the list fails.');
        }

        // adjust the memory
        this.elem.splice(first, 0, t);
        ++this.n;
    }

    find(t: T): T | null {
        return this.findById(t.id);
    }

    findById(id: number): T | null {
        return this._findById(id);
    }

    private _findById(id: number): T | null {
        let first = 0, last = this.n - 1;
        while (first <= last) {
            const mid = Math.floor((first + last) / 2);
            let cur = this.elem[mid].id;
            if (cur > id) {
                last = mid - 1; // and first stays the same
            } else if (cur < id) {
                first = mid + 1; // and last stays the same
            } else {
                return this.elem[mid];
            }
        }

        return null;
    }

    clearTags() {
        this.elem.forEach((item) => {
            item.tag = 0;
        });
    }

    clear() {
        this.elem = [];
        this.n = 0;
    }
}
