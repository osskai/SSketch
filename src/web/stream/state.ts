import Emitter from "@/web/stream/emitter";


export default class StateStream extends Emitter {

    private _value: any;

    constructor(value: any) {
        super();
        this._value = value;
    }

    get value() {
        return this._value;
    }

    set value(v) {
        this.next(v);
    }

    next(value: any) {
        this._value = value;
        super.next(value);
    }

    update(updater: Function) {
        this.value = updater(this._value);
    }

    mutate(mutator: Function) {
        mutator(this._value);
        this.next(this._value);
    }

    attach(observer: Function) {
        observer(this._value);
        return super.attach(observer);
    }
}
