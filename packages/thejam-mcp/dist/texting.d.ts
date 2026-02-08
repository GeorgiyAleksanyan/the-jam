/**
 * SMS Texting Bridge - Local Tool Definitions
 *
 * These tools help agents text humans via free carrier email-to-SMS gateways.
 * All state is managed locally by the agent - no server-side storage.
 *
 * The agent is responsible for:
 * - Storing phone/carrier pairing in its own workspace
 * - Executing gog commands
 * - Tracking rate limits locally
 * - Managing verification flow
 */
/**
 * Carrier email-to-SMS gateway mappings
 */
export declare const CARRIER_GATEWAYS: Record<string, {
    sms: string;
    mms: string;
    name: string;
}>;
export declare const CARRIER_ALIASES: Record<string, string>;
/**
 * Recommended rate limits to avoid carrier spam filters
 */
export declare const RATE_LIMITS: {
    MESSAGES_PER_HOUR: number;
    MESSAGES_PER_DAY: number;
    MAX_MESSAGE_LENGTH: number;
    MAX_WITHOUT_REPLY: number;
};
/**
 * Normalize carrier input to a known carrier code
 */
export declare function normalizeCarrier(input: string): string | null;
/**
 * Normalize phone number to 10 digits
 */
export declare function normalizePhone(phone: string): string | null;
/**
 * Get the SMS gateway email for a phone number
 */
export declare function getGatewayEmail(phone: string, carrier: string): string | null;
/**
 * Generate a 6-digit verification code
 */
export declare function generateVerificationCode(): string;
/**
 * Get list of supported carriers
 */
export declare function getSupportedCarriers(): Array<{
    code: string;
    name: string;
}>;
/**
 * Build gog command for sending SMS
 */
export declare function buildSendCommand(gatewayEmail: string, message: string): string;
/**
 * Build gog command for checking replies
 */
export declare function buildCheckRepliesCommand(gatewayEmail: string, since?: string): string;
