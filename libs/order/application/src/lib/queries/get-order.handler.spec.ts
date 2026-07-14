import { Test, TestingModule } from '@nestjs/testing';
import { GetOrderHandler } from './get-order.handler';
import { GetOrderQuery } from './get-order.query';
import {
    ORDER_REPOSITORY,
    IOrderRepository,
    OrderNotFoundException,
    OrderStatusEnum,
    Order,
} from '@doms/order/domain';

const mockOrder = {
    id: 'e3a3eb39-1eeb-4f7f-90f2-f4c4bcb61c6e',
    customerId: 'b4428981-5678-4986-93ed-685000708ea4',
    channel: 'web',
    status: { value: OrderStatusEnum.DRAFT },
    totalAmount: { amount: 2000, currency: 'USD' },
    shippingAddress: {
        street: '14 Old Town Street',
        city: 'Ajah',
        state: 'Lagos',
        postcode: '100101',
        country: 'NG',
    },
    createdAt: new Date('2026-05-04'),
    updatedAt: new Date('2026-05-04'),
    lines: [
        {
            sku: 'WIDGET-1234',
            quantity: 2,
            unitPrice: { amount: 1000, currency: 'USD' },
            lineTotal: () => ({ amount: 2000, currency: 'USD' }),
        },
    ],
};

const mockOrderRepository: jest.Mocked<IOrderRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
};

describe('GetOrderHandler', () => {
    let handler: GetOrderHandler;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetOrderHandler,
                { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
            ],
        }).compile();

        handler = module.get<GetOrderHandler>(GetOrderHandler);
    });

    afterEach(() => jest.clearAllMocks());

    it('should return order response when order is found', async () => {
        mockOrderRepository.findById.mockResolvedValueOnce(mockOrder as unknown as Order);

        const query = new GetOrderQuery(mockOrder.id);
        const result = await handler.execute(query);

        expect(mockOrderRepository.findById).toHaveBeenCalledWith(
            'e3a3eb39-1eeb-4f7f-90f2-f4c4bcb61c6e',
        );
        expect(result.orderId).toBe('e3a3eb39-1eeb-4f7f-90f2-f4c4bcb61c6e');
        expect(result.status).toBe(OrderStatusEnum.DRAFT);
    });

    it('should throw OrderNotFoundException when order does not exist', async () => {
        mockOrderRepository.findById.mockResolvedValueOnce(null);
        const query = new GetOrderQuery('f434516a-ee5d-41c1-b318-c0a6a6b19e17');

        await expect(handler.execute(query)).rejects.toThrow(OrderNotFoundException);
    });
});
