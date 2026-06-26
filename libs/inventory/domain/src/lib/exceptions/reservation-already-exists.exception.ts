export class ReservationAlreadyExistsException extends Error {
    constructor(readonly reservationId: string) {
        super(`Reservation (${reservationId}) already exists`);
        this.name = 'ReservationAlreadyExistsException';
    }
}
