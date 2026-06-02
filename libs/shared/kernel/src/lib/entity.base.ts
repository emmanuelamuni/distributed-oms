export abstract class EntityBase<T> {
    protected readonly props: T;
    protected readonly _id: string;

    protected constructor(props: T, id: string) {
        this.props = props;
        this._id = id;
    }

    equals(other: EntityBase<T>): boolean {
        if (other === null || other === undefined) return false;
        if (!(other instanceof EntityBase)) return false;
        return this._id === other._id;
    }

    get id(): string {
        return this._id;
    }
}
