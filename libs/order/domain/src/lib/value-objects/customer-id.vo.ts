import { UniqueId } from '@doms/shared/kernel';

export class CustomerId extends UniqueId {
    static create(value: string): CustomerId {
        CustomerId.validate(value);
        return new CustomerId({ value });
    }
}
