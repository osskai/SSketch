export default class Param {

    public id: number;

    protected value: number;
    protected symbol: string;

    // for the solver usage
    public tag: number;
    public know: boolean;
    public substd: number;

    constructor(value: number, symbol?: string) {
        this.id = -1;
        this.value = value;
        this.symbol = symbol || 'N';

        this.tag = 0;
        this.know = false;
        this.substd = 0;
    }

    get info() {
        return [this];
    }

    set(value: number, symbol?: string) {
        this.value = value;
        if (symbol !== undefined) this.symbol = symbol;
    }

    get() {
        return this.value;
    }

    toString() {
        return this.symbol;
    }

    visitParams(callback: Function) {
        callback(this);
    }

    solverInit() {
        this.know = false;
        this.substd = 0;
    }
}
