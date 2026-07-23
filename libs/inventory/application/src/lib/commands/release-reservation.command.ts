import { CommandBase } from '@doms/shared/kernel';

// Create a temporary payload shape
export interface TemporaryPayload {
    correlationId: string;
    lines: { sku: string; nodeId: string }[];
}

export class ReleaseReservationCommand extends CommandBase {
    constructor(readonly payload: TemporaryPayload) {
        super(payload.correlationId);
    }
}
