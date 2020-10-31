import Command from "@/web/sketches/commands/command";
import Constraint from "../constraints/constraint";
import ConstraintManager from "../constraints/manager";
import Sketcher from "../sketcher";


export class AddConstraintCommand extends Command {

    private readonly constraints: Array<Constraint>;
    private readonly manager: ConstraintManager;

    constructor(viewer: Sketcher, constraints: Array<Constraint>) {
        super(viewer);

        this.constraints = constraints;
        this.manager = this.viewer.constraintManager;

        this.__class = "Command.AddConstraint";
    }

    execute(): void {
        this.manager.addConstraints(this.constraints);
    }

    undo(): void {
        this.manager.removeConstraints(this.constraints);
    }

}

export class RemoveConstraintCommand extends Command {

    private readonly constraints: Array<Constraint>;
    private readonly manager: ConstraintManager;

    constructor(viewer: Sketcher, constraints: Array<Constraint>) {
        super(viewer);

        this.constraints = constraints;
        this.manager = this.viewer.constraintManager;

        this.__class = "Command.RemoveConstraint";
    }

    execute(): void {
        this.manager.removeConstraints(this.constraints);
    }

    undo(): void {
        this.manager.addConstraints(this.constraints);
    }

}
