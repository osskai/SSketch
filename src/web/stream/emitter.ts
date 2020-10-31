import {syslog} from "@/web/syslog";

const READY = 0;
const EMITTING = 1;


export default class Emitter {

    private readonly observers: Array<Function>;
    private state: number;

    constructor() {
        this.observers = [];
        this.state = READY;
    }

    attach(observer: Function) {
        this.observers.push(observer);
        return () => this.detach(observer);
    }

    detach(callback: Function) {
        for (let i = this.observers.length - 1; i >= 0 ; i--) {
            if (this.observers[i] === callback) {
                this.observers.splice(i, 1);
            }
        }
    };

    next(value: any) {
        if (this.state === EMITTING) {
            syslog.warn('recursive dispatch');
            return;
        }
        try {
            this.state = EMITTING;
            for (let i = 0; i < this.observers.length; i++) {
                this.observers[i](value);
            }
        } finally {
            this.state = READY;
        }
    }
}
