import { Injectable, Inject } from '@nestjs/common';

import {
    INVENTORY_REPOSITORY,
    IInventoryRepositoryPort,
    AtpCalculatorService,
} from '@doms/inventory/domain';

import { AvailabilityResponseDto, NodeAvailabilityDto } from '../dtos/availability-response.dto';

/**
 * The data response tells the caller what node can be reserved on.
 * Extracted from the GetAvailabilityHandler to avoid handler chaining
 */
@Injectable()
export class GetAvailabilityService {
    constructor(
        @Inject(INVENTORY_REPOSITORY)
        private readonly inventoryRepositiry: IInventoryRepositoryPort,
    ) {}

    async execute(skus: string[]): Promise<AvailabilityResponseDto[] | null> {
        const inventoryNodeMap = await this.inventoryRepositiry.findBySkus(skus);

        // Orders can't be fulfilled when length aren't equal
        if (inventoryNodeMap.size !== skus.length) return null;

        const response: AvailabilityResponseDto[] = [];

        for (const sku of inventoryNodeMap.keys()) {
            const inventoryNodes = inventoryNodeMap.get(sku);

            if (inventoryNodes) {
                let totalAvailable = 0;
                const nodes: NodeAvailabilityDto[] = [];

                for (const node of inventoryNodes) {
                    const available = AtpCalculatorService.calculate(node).value;
                    nodes.push({ available, nodeId: node.nodeId });
                    totalAvailable += available;
                }

                response.push({ sku, totalAvailable, nodes });
            }
        }

        return response;
    }
}
