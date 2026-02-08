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
export const CARRIER_GATEWAYS: Record<string, { sms: string; mms: string; name: string }> = {
  // Major US carriers
  tmobile: { sms: 'tmomail.net', mms: 'tmomail.net', name: 'T-Mobile' },
  att: { sms: 'txt.att.net', mms: 'mms.att.net', name: 'AT&T' },
  verizon: { sms: 'vtext.com', mms: 'vzwpix.com', name: 'Verizon' },
  sprint: { sms: 'messaging.sprintpcs.com', mms: 'pm.sprint.com', name: 'Sprint' },
  
  // Google
  googlefi: { sms: 'msg.fi.google.com', mms: 'msg.fi.google.com', name: 'Google Fi' },
  
  // MVNOs and regional
  uscellular: { sms: 'email.uscc.net', mms: 'mms.uscc.net', name: 'US Cellular' },
  cricket: { sms: 'sms.cricketwireless.net', mms: 'mms.cricketwireless.net', name: 'Cricket' },
  metro: { sms: 'mymetropcs.com', mms: 'mymetropcs.com', name: 'Metro by T-Mobile' },
  boost: { sms: 'sms.myboostmobile.com', mms: 'myboostmobile.com', name: 'Boost Mobile' },
  mint: { sms: 'tmomail.net', mms: 'tmomail.net', name: 'Mint Mobile' }, // Uses T-Mobile
  visible: { sms: 'vtext.com', mms: 'vzwpix.com', name: 'Visible' }, // Uses Verizon
  
  // Canadian carriers
  rogers: { sms: 'pcs.rogers.com', mms: 'mms.rogers.com', name: 'Rogers' },
  bell: { sms: 'txt.bell.ca', mms: 'txt.bell.ca', name: 'Bell' },
  telus: { sms: 'msg.telus.com', mms: 'msg.telus.com', name: 'Telus' },
};

export const CARRIER_ALIASES: Record<string, string> = {
  't-mobile': 'tmobile',
  'at&t': 'att',
  'at and t': 'att',
  'google fi': 'googlefi',
  'fi': 'googlefi',
  'us cellular': 'uscellular',
  'metro pcs': 'metro',
  'metropcs': 'metro',
  'mint mobile': 'mint',
};

/**
 * Recommended rate limits to avoid carrier spam filters
 */
export const RATE_LIMITS = {
  MESSAGES_PER_HOUR: 10,
  MESSAGES_PER_DAY: 50,
  MAX_MESSAGE_LENGTH: 160,
  MAX_WITHOUT_REPLY: 5, // Pause if no reply after this many
};

/**
 * Normalize carrier input to a known carrier code
 */
export function normalizeCarrier(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  
  if (!normalized) return null;
  if (CARRIER_GATEWAYS[normalized]) return normalized;
  if (CARRIER_ALIASES[normalized]) return CARRIER_ALIASES[normalized];
  
  // Fuzzy match
  for (const [code, info] of Object.entries(CARRIER_GATEWAYS)) {
    if (info.name.toLowerCase().includes(normalized) || normalized.includes(code)) {
      return code;
    }
  }
  
  return null;
}

/**
 * Normalize phone number to 10 digits
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  
  // Remove leading 1 for US numbers
  const normalized = digits.length === 11 && digits.startsWith('1') 
    ? digits.slice(1) 
    : digits;
  
  return normalized.length === 10 ? normalized : null;
}

/**
 * Get the SMS gateway email for a phone number
 */
export function getGatewayEmail(phone: string, carrier: string): string | null {
  const normalizedCarrier = normalizeCarrier(carrier);
  if (!normalizedCarrier) return null;
  
  const gateway = CARRIER_GATEWAYS[normalizedCarrier];
  if (!gateway) return null;
  
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  
  return `${normalizedPhone}@${gateway.sms}`;
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get list of supported carriers
 */
export function getSupportedCarriers(): Array<{ code: string; name: string }> {
  return Object.entries(CARRIER_GATEWAYS).map(([code, info]) => ({
    code,
    name: info.name,
  }));
}

/**
 * Build gog command for sending SMS
 */
export function buildSendCommand(gatewayEmail: string, message: string): string {
  const escapedMessage = message.replace(/"/g, '\\"');
  return `gog gmail send --to "${gatewayEmail}" --subject "" --body "${escapedMessage}"`;
}

/**
 * Build gog command for checking replies
 */
export function buildCheckRepliesCommand(gatewayEmail: string, since: string = '1h'): string {
  const domain = gatewayEmail.split('@')[1];
  return `gog gmail search "from:${domain} newer_than:${since}" --max 10`;
}
