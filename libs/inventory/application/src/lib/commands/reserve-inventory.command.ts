import { CommandBase } from '@doms/shared/kernel';
import { ReserveInventoryCommandPayload } from '@doms/shared/events';

export class ReserveInventoryCommand extends CommandBase {
    constructor(readonly payload: ReserveInventoryCommandPayload) {
        super(payload.correlationId);
    }
}
