import { Test, TestingModule } from '@nestjs/testing';
import { INVENTORY_REPOSITORY, Quantity } from '@doms/inventory/domain';
import { GetAvailabilityService } from './get-availability.service';

const mockInventoryRepository = { findBySkus: jest.fn() };

const makeNode = (nodeId: string, onHand: number, reserved: number) => ({
    nodeId,
    sku: 'WIDGET-1234',
    onHand: Quantity.create(onHand),
    reserved: Quantity.create(reserved),
    get available() {
        return this.onHand.subtract(this.reserved);
    },
});

describe('GetAvailabilityService', () => {
    let service: GetAvailabilityService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetAvailabilityService,
                { provide: INVENTORY_REPOSITORY, useValue: mockInventoryRepository },
            ],
        }).compile();

        service = module.get(GetAvailabilityService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should return null when inventory map size does not match requested skus length', async () => {
        mockInventoryRepository.findBySkus.mockResolvedValue(new Map());

        const result = await service.execute(['WIDGET-1234']);

        expect(result).toBeNull();
    });

    it('should aggregate available quantity and nodes correctly across SKUs', async () => {
        const inventoryMap = new Map();
        inventoryMap.set('WIDGET-1234', [makeNode('node-001', 10, 3), makeNode('node-002', 20, 5)]);

        mockInventoryRepository.findBySkus.mockResolvedValue(inventoryMap);

        const result = await service.execute(['WIDGET-1234']);

        expect(result).not.toBeNull();
        expect(result![0].totalAvailable).toBe(22);
        expect(result![0].nodes).toHaveLength(2);
        expect(result![0].nodes).toEqual([
            { nodeId: 'node-001', available: 7 },
            { nodeId: 'node-002', available: 15 },
        ]);
    });

    it('should return zero totalAvailable when all nodes are fully reserved', async () => {
        const inventoryMap = new Map();
        inventoryMap.set('WIDGET-1234', [makeNode('node-001', 5, 5), makeNode('node-002', 10, 10)]);

        mockInventoryRepository.findBySkus.mockResolvedValue(inventoryMap);

        const result = await service.execute(['WIDGET-1234']);

        expect(result![0].totalAvailable).toBe(0);
        expect(result![0].nodes).toEqual([
            { nodeId: 'node-001', available: 0 },
            { nodeId: 'node-002', available: 0 },
        ]);
    });
});
