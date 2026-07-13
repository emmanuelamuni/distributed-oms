import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateOrderCommand, GetOrderQuery } from '@doms/order/application';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let controller: AppController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let appService: AppService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                { provide: CommandBus, useValue: { execute: jest.fn() } },
                { provide: QueryBus, useValue: { execute: jest.fn() } },
                {
                    provide: AppService,
                    useValue: { getData: jest.fn().mockReturnValue({ message: 'Hello' }) },
                },
            ],
        }).compile();

        controller = module.get<AppController>(AppController);
        commandBus = module.get<CommandBus>(CommandBus);
        queryBus = module.get<QueryBus>(QueryBus);
        appService = module.get<AppService>(AppService);
    });

    describe('getData', () => {
        it('should call appService.getData', async () => {
            const result = controller.getData();

            expect(appService.getData).toHaveBeenCalled();
            expect(result).toEqual({ message: 'Hello' });
        });
    });

    describe('create', () => {
        it('should dispatch CreateOrderCommand with correct data', async () => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const dto = {
                customerId: 'uuid-1',
                channel: 'web',
                shippingAddress: { city: 'Makoko' },
                lines: [],
            } as any;

            const correlationId = 'corr-123';
            const expectedResult = { id: 'order-1' };

            jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.create(dto, correlationId);

            expect(commandBus.execute).toHaveBeenCalledWith(
                new CreateOrderCommand(
                    dto.customerId,
                    dto.channel,
                    dto.shippingAddress,
                    dto.lines,
                    correlationId,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('find', () => {
        it('should dispatch GetOrderQuery with correct ID and correlationId', async () => {
            const id = '550e8400-e29b-41d4-a716-446655440000';
            const correlationId = 'corr-456';
            const expectedResult = { id };

            jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.find(id, correlationId);

            expect(queryBus.execute).toHaveBeenCalledWith(new GetOrderQuery(id, correlationId));
            expect(result).toBe(expectedResult);
        });
    });
});
