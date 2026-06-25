export class ReservationNotFoundException extends Error {
    constructor(readonly reservationId: string) {
        super(`Reservation not found: ${reservationId}`);
        this.name = 'ReservationNotFoundException';
    }
}
