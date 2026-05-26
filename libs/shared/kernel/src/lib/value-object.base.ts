// export abstract class ValueObjectBase<T extends Record<string, unknown>> {
export abstract class ValueObjectBase<T extends object> {
    protected props: T;

    protected constructor(props: T) {
        this.props = Object.freeze({ ...props });
    }

    private checkEquality(a: unknown, b: unknown): boolean {
        // Same memory or primitive equality
        if (a === b) return true;

        // If checking dates
        if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime();
        }

        // Object checks
        if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
            if (a.constructor !== b.constructor) return false;

            const keysA = Object.keys(a as Record<string, unknown>);
            const keysB = Object.keys(b as Record<string, unknown>);

            if (keysA.length !== keysB.length) return false;

            // Check recursively on nesting
            /* eslint-disable @typescript-eslint/no-explicit-any */
            return keysA.every((key) => this.checkEquality((a as any)[key], (b as any)[key]));
        }

        return false;
    }

    public equals(vo?: ValueObjectBase<T>): boolean {
        if (vo === null || vo === undefined) return false;
        if (vo.constructor.name !== this.constructor.name) return false;
        return this.checkEquality(this.props, vo.props);
    }
}
