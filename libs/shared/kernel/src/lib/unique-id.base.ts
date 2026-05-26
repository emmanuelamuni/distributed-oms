import { ValueObjectBase } from './value-object.base';

export abstract class UniqueId extends ValueObjectBase<{ value: string }> {
    protected static validate(value: string): void {
        const UUID_V4_REGEX =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!UUID_V4_REGEX.test(value)) {
            throw new Error(`ID must be a valid UUID v4. You provided: ${value}`);
        }
    }

    get value(): string {
        return this.props.value;
    }
}
