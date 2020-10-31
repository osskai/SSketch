import Sketcher from "@/web/sketches/sketcher";
import Command, {TransactionCommand} from "@/web/sketches/commands/command";
import {SM_alloc, SM_free} from "@/web/managers/om";

/**
 * Main class
 * @class HistoryManager
 */
export default class HistoryManager {

    public readonly viewer: Sketcher;

    private stack: Array<Command>;
    private sp: number;

    public transaction: TransactionManager;

    private disposers: any;

    constructor(viewer: Sketcher) {
        this.viewer = viewer;

        this.stack = [];
        this.sp = -1;

        this.transaction = new TransactionManager(this);
        this.bindHotKeys();
    }

    dispose() {
        this.disposers();
    }

    /**
     * Bind 'undo' and 'redo' actions to 'Alt+Z', 'Alt+Shift+Z' hot keys.
     * It is a basic implementation for quick testing and should be replaced with custom event handlers
     * for more flexible processing.
     * @returns {HistoryManager}
     */
    bindHotKeys() {
        this.addEventListener(window,"keydown", (e: KeyboardEvent) => {
            const keyZ = e.key === 'z' || e.key === 'Z';
            if (e.metaKey && keyZ) {
                this.undo();
            } else if (e.shiftKey && keyZ) {
                this.redo();
            }
        }, false);
    }

    addEventListener(subject: any, event: any, fn: Function, useCapture: any) {
        subject.addEventListener(event, fn, useCapture);
        this.disposers = () => subject.removeEventListener(event, fn, useCapture);
    }

    /**
     * Remember executed command containing "execute" and "undo" functions
     * @param {Object|Function} command - either an object with "redo" and "undo" functions or "redo" function itself
     * @returns {HistoryManager}
     */
    record(command: Command) {
        this._record(command);
    }

    /**
     * Execute function and record it with its opposite "undo" function
     * @param {Object} command - either an object with "execute" and "undo" functions or "redo" function itself
     * @returns {HistoryManager}
     */
    execute(command: Command) {
        let lastCmd = this.stack[this.sp];

        let isUpdatableCmd = lastCmd &&
            lastCmd.updatable && command.updatable &&
            lastCmd.class === command.class &&
            lastCmd.id === command.id;

        if (isUpdatableCmd) {
            lastCmd.update(command);
            command = lastCmd;
        } else {
            this.record(command);
        }

        if (this.transaction.isInProgress()) return;

        command.execute();
    }

    private _record(command: Command) {
        if (this.transaction.isInProgress())
            return this.transaction._record(command);

        this._rebase();

        SM_alloc(command);
        this.stack.push(command);
        this.sp++;

        this._keepLimit();
    }

    //forget "future" commands if stack pointer is not at the end
    private _rebase() {
        if (this.canRedo())
            this.stack.length = this.sp + 1;
    }

    //sustain limited size of stack; cut extra commands starting with the latest ones
    private _keepLimit() {
        if (this.stack.length <= 10)
            return;

        let exceedsBy = this.stack.length - 10;

        if (exceedsBy === 1) {
            const command = this.stack.shift(); //this is the most common case, so using "shift" will increase performance a bit
            SM_free(command!);
        }
        else
            this.stack.splice(0, exceedsBy);

        this.sp -= exceedsBy; //normalize stack pointer for the new stack length
    }

    /**
     * Undo previous command if possible
     * @returns {HistoryManager}
     */
    undo() {
        if (!this.canUndo())
            return this;

        let command = this.stack[this.sp];

        this.sp--;
        command.undo();
    }

    /**
     * Check whether undoing previous command is possible
     * @returns {boolean}
     */
    canUndo() {
        return this.sp >= 0;
    }

    /**
     * Redo the command which was previously undone
     * @returns {HistoryManager}
     */
    redo() {
        if (!this.canRedo())
            return this;

        let command = this.stack[this.sp + 1]; //execute next command after stack pointer

        this.sp++;
        command.execute();
    }

    /**
     * Check whether redoing command is possible
     * @returns {boolean}
     */
    canRedo() {
        return this.sp < this.stack.length - 1; //if stack pointer is not at the end
    }

    /**
     * Reset all commands from memory
     */
    reset() {
        for (let i = this.stack.length - 1; i >= 0; --i) {
            SM_free(this.stack[i]);
        }
        this.stack = [];
        this.sp = -1;
    }

    /**
     * Check whether the commands stack is empty
     * @returns {boolean}
     */
    isEmpty() {
        return !this.stack.length;
    }

    /**
     * Check whether the commands stack size reaches its limit
     * @returns {boolean}
     */
    isFull() {
        return this.stack.length === 10;
    }

    /**
     * Get number of commands in memory stack
     * @returns {Number}
     */
    getSize() {
        return this.stack.length;
    }
}

/**
 * Transaction manager helper.
 * Allows working with transactions from HistoryManager. Requires its instance as a constructor's parameter.
 * @class TransactionManager
 */
class TransactionManager {

    static PENDING = 0;
    static IN_PROGRESS = 1;

    private tracker: HistoryManager;
    private sequence: Array<Command>;

    public state: number;

    constructor(tracker: HistoryManager) {
        this.tracker = tracker;
        this.sequence = [];
        this.state = TransactionManager.PENDING;

        this._reset();
    }

    private static _execBack(sequence: Array<Command>) {
        for (let i = sequence.length - 1; i >= 0; i--)
            sequence[i].undo();
    }

    begin() {
        this.state = TransactionManager.IN_PROGRESS;
    }

    end() {
        const seq = this.sequence;
        this._reset();

        if (seq.length > 0) {
            this.tracker.execute(new TransactionCommand(this.tracker.viewer, seq));
        }
    }

    cancel() {
        TransactionManager._execBack(this.sequence);
        this._reset();
    }

    isInProgress() {
        return this.state === TransactionManager.IN_PROGRESS;
    }

    isPending() {
        return this.state === TransactionManager.PENDING;
    }

    public _record(command: Command) {
        SM_alloc(command);
        this.sequence.push(command);
    }

    private _reset() {
        this.state = TransactionManager.PENDING;
        for (let i = this.sequence.length - 1; i >= 0; --i) {
            const seq = this.sequence[i];
            SM_free(seq);
        }
        this.sequence = [];
    }
}
