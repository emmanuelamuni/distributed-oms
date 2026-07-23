import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { ReleaseReservationHandler } from './release-reservation.handler';
import { ReleaseReservationCommand } from './release-reservation.command';
import { INVENTORY_REPOSITORY } from '@doms/inventory/domain';

const validCommand = new ReleaseReservationCommand({
    correlationId: '62d73b0e-40e0-4dbf-9aa8-0b23f5825c75',
    lines: [{ sku: 'WIDGET-1234', nodeId: 'node-001' }],
});

const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: false,
    isReleased: false,
} as unknown as QueryRunner;

const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource;

const mockInventoryRepository = { findBySkusAndNodes: jest.fn(), save: jest.fn() };

const makeNode = (sku = 'WIDGET-1234', nodeId = 'node-001') => ({
    sku,
    nodeId,
    releaseReservation: jest.fn(),
});

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('ReleaseReservationHandler', () => {
    let handler: ReleaseReservationHandler;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReleaseReservationHandler,
                { provide: INVENTORY_REPOSITORY, useValue: mockInventoryRepository },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        handler = module.get(ReleaseReservationHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
        (mockQueryRunner as any).isTransactionActive = false;
        (mockQueryRunner as any).isReleased = false;
    });

    it('should load nodes, release reservations, and commit transaction', async () => {
        const node = makeNode();
        mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);
        mockInventoryRepository.save.mockResolvedValue(undefined);

        await handler.execute(validCommand);

        expect(mockInventoryRepository.findBySkusAndNodes).toHaveBeenCalledWith([
            { sku: 'WIDGET-1234', nodeId: 'node-001' },
        ]);
        expect(node.releaseReservation).toHaveBeenCalledWith(
            '62d73b0e-40e0-4dbf-9aa8-0b23f5825c75',
        );
        expect(mockInventoryRepository.save).toHaveBeenCalledWith(node, mockQueryRunner);
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw and log when nodes length does not match input lines length', async () => {
        mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([]);

        await handler.execute(validCommand);

        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback when save fails', async () => {
        const node = makeNode();
        mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);
        mockInventoryRepository.save.mockRejectedValue(new Error('DB error'));
        (mockQueryRunner as any).isTransactionActive = true;

        await handler.execute(validCommand);

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback when releaseReservation throws', async () => {
        const node = makeNode();
        node.releaseReservation.mockImplementation(() => {
            throw new Error('Reservation not found');
        });
        mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);
        (mockQueryRunner as any).isTransactionActive = true;

        await handler.execute(validCommand);

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should always release queryRunner in finally block', async () => {
        const node = makeNode();
        mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);
        mockInventoryRepository.save.mockResolvedValue(undefined);

        await handler.execute(validCommand);

        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
});
