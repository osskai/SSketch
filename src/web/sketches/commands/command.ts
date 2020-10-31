import Sketcher from "@/web/sketches/sketcher";
import TaggedObject from "@/web/managers/om";


export default abstract class Command extends TaggedObject {

    protected readonly viewer: Sketcher;

    public updatable: boolean;
    public id: number;

    protected constructor(viewer: Sketcher) {
        super();

        this.viewer = viewer;
        this.updatable = false;
        this.id = -1;

        this.__class = "Command.root";
    }

    abstract execute(): void;

    abstract undo(): void;

    update(cmd: Command) {
    }
}


export class TransactionCommand extends Command {

    private readonly commands: Array<Command>;

    constructor(viewer: Sketcher, commands: Array<Command>) {
        super(viewer);

        this.commands = commands;

        this.__class = "Command.Transaction";
    }

    execute(): void {
        this.commands.forEach((command) => {
            command.execute();
        })
    }

    undo(): void {
        for (let i = this.commands.length - 1; i >= 0; --i) {
            this.commands[i].undo();
        }
    }

}
