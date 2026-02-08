/**
 * Carrier email-to-SMS gateway mappings
 * Format: carrier code → { sms: gateway, mms: gateway }
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
 * Normalize carrier input to a known carrier code
 */
export function normalizeCarrier(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  
  // Empty input
  if (!normalized) {
    return null;
  }
  
  // Direct match
  if (CARRIER_GATEWAYS[normalized]) {
    return normalized;
  }
  
  // Alias match
  if (CARRIER_ALIASES[normalized]) {
    return CARRIER_ALIASES[normalized];
  }
  
  // Fuzzy match - check if input contains carrier name
  for (const [code, info] of Object.entries(CARRIER_GATEWAYS)) {
    if (info.name.toLowerCase().includes(normalized) || normalized.includes(code)) {
      return code;
    }
  }
  
  return null;
}

/**
 * Get the SMS gateway email for a phone number
 */
export function getGatewayEmail(phone: string, carrier: string): string | null {
  const normalizedCarrier = normalizeCarrier(carrier);
  if (!normalizedCarrier) return null;
  
  const gateway = CARRIER_GATEWAYS[normalizedCarrier];
  if (!gateway) return null;
  
  // Normalize phone to digits only
  const digits = phone.replace(/\D/g, '');
  
  // Remove leading 1 for US numbers if present and 11 digits
  const normalized = digits.length === 11 && digits.startsWith('1') 
    ? digits.slice(1) 
    : digits;
  
  if (normalized.length !== 10) {
    return null; // Invalid phone length
  }
  
  return `${normalized}@${gateway.sms}`;
}

/**
 * Extract phone number from gateway email address
 */
export function extractPhoneFromGateway(email: string): { phone: string; carrier: string } | null {
  const match = email.match(/^(\d{10})@(.+)$/);
  if (!match) return null;
  
  const [, digits, domain] = match;
  
  // Find carrier by domain
  for (const [code, info] of Object.entries(CARRIER_GATEWAYS)) {
    if (info.sms === domain || info.mms === domain) {
      return { phone: `+1${digits}`, carrier: code };
    }
  }
  
  return null;
}

/**
 * List of supported carriers for display
 */
export function getSupportedCarriers(): Array<{ code: string; name: string }> {
  return Object.entries(CARRIER_GATEWAYS).map(([code, info]) => ({
    code,
    name: info.name,
  }));
}

/**
 * Rate limiting constants
 */
export const RATE_LIMITS = {
  MESSAGES_PER_HOUR: 10,
  MESSAGES_PER_DAY: 50,
  MAX_MESSAGE_LENGTH: 160,
  COOLDOWN_NO_REPLY_HOURS: 4,
  MAX_UNREAD_BEFORE_PAUSE: 5,
};
