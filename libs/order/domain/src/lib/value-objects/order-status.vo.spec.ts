import { OrderStatus, OrderStatusEnum } from './order-status.vo';

describe('OrderStatus', () => {
    describe('isTerminal', () => {
        it('should return true for CANCELLED', () => {
            expect(OrderStatus.create(OrderStatusEnum.CANCELLED).isTerminal()).toBe(true);
        });

        it('should return false for DRAFT', () => {
            expect(OrderStatus.create(OrderStatusEnum.DRAFT).isTerminal()).toBe(false);
        });

        it('should return false for CONFIRMED', () => {
            expect(OrderStatus.create(OrderStatusEnum.CONFIRMED).isTerminal()).toBe(false);
        });

        it('should return false for ALLOCATED', () => {
            expect(OrderStatus.create(OrderStatusEnum.ALLOCATED).isTerminal()).toBe(false);
        });
    });

    describe('isCancellable', () => {
        it('should return true for DRAFT', () => {
            expect(OrderStatus.create(OrderStatusEnum.DRAFT).isCancellable()).toBe(true);
        });

        it('should return true for CONFIRMED', () => {
            expect(OrderStatus.create(OrderStatusEnum.CONFIRMED).isCancellable()).toBe(true);
        });

        it('should return false for ALLOCATED', () => {
            expect(OrderStatus.create(OrderStatusEnum.ALLOCATED).isCancellable()).toBe(false);
        });

        it('should return false for CANCELLED', () => {
            expect(OrderStatus.create(OrderStatusEnum.CANCELLED).isCancellable()).toBe(false);
        });
    });

    describe('equals', () => {
        it('should be equal when status matches', () => {
            const a = OrderStatus.create(OrderStatusEnum.DRAFT);
            const b = OrderStatus.create(OrderStatusEnum.DRAFT);
            expect(a.equals(b)).toBe(true);
        });

        it('should not be equal when status differs', () => {
            const a = OrderStatus.create(OrderStatusEnum.DRAFT);
            const b = OrderStatus.create(OrderStatusEnum.CONFIRMED);
            expect(a.equals(b)).toBe(false);
        });
    });
});
