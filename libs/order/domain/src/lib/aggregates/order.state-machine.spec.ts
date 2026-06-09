import { OrderStateMachine } from './order.state-machine';
import { OrderStatusEnum } from '../value-objects/order-status.vo';

describe('OrderStateMachine', () => {
    describe('valid transitions', () => {
        it('should allow DRAFT -> CONFIRMED', () => {
            expect(
                OrderStateMachine.canTransition(OrderStatusEnum.DRAFT, OrderStatusEnum.CONFIRMED),
            ).toBe(true);
        });

        it('should allow DRAFT -> CANCELLED', () => {
            expect(
                OrderStateMachine.canTransition(OrderStatusEnum.DRAFT, OrderStatusEnum.CANCELLED),
            ).toBe(true);
        });

        it('should allow CONFIRMED -> ALLOCATED', () => {
            expect(
                OrderStateMachine.canTransition(
                    OrderStatusEnum.CONFIRMED,
                    OrderStatusEnum.ALLOCATED,
                ),
            ).toBe(true);
        });

        it('should allow CONFIRMED -> CANCELLED', () => {
            expect(
                OrderStateMachine.canTransition(
                    OrderStatusEnum.CONFIRMED,
                    OrderStatusEnum.CANCELLED,
                ),
            ).toBe(true);
        });
    });

    describe('invalid transitions', () => {
        it('should not allow DRAFT -> ALLOCATED', () => {
            expect(
                OrderStateMachine.canTransition(OrderStatusEnum.DRAFT, OrderStatusEnum.ALLOCATED),
            ).toBe(false);
        });

        it('should not allow ALLOCATED -> CONFIRMED', () => {
            expect(
                OrderStateMachine.canTransition(
                    OrderStatusEnum.ALLOCATED,
                    OrderStatusEnum.CONFIRMED,
                ),
            ).toBe(false);
        });

        it('should not allow CANCELLED -> DRAFT', () => {
            expect(
                OrderStateMachine.canTransition(OrderStatusEnum.CANCELLED, OrderStatusEnum.DRAFT),
            ).toBe(false);
        });

        it('should not allow CANCELLED -> CONFIRMED', () => {
            expect(
                OrderStateMachine.canTransition(
                    OrderStatusEnum.CANCELLED,
                    OrderStatusEnum.CONFIRMED,
                ),
            ).toBe(false);
        });

        it('should not allow ALLOCATED -> CANCELLED', () => {
            expect(
                OrderStateMachine.canTransition(
                    OrderStatusEnum.ALLOCATED,
                    OrderStatusEnum.CANCELLED,
                ),
            ).toBe(false);
        });
    });
});
