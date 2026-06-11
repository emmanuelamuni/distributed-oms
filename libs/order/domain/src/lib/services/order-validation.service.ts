const VALID_CHANNELS = ['web', 'pos', 'api', 'marketplace'] as const;

export type OrderChannel = (typeof VALID_CHANNELS)[number];

export class OrderValidationService {
    static isValidChannel(channel: string): boolean {
        return VALID_CHANNELS.includes(channel as OrderChannel);
    }

    static validateChannel(channel: string): void {
        if (!this.isValidChannel(channel)) {
            throw new Error(
                `Invalid order channel: ${channel}.\nValid channels are ${VALID_CHANNELS.join(', ')}.`,
            );
        }
    }
}
