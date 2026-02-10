/**
 * Google Sheets Webhook Integration
 * Syncs email signups to Google Sheets in real-time
 */

const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const SHEETS_WEBHOOK_SECRET = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

interface SubscriberData {
  email: string;
  type: string;
  source?: string;
  subscribed_at?: string;
  verified?: boolean;
  verified_at?: string;
  unsubscribed?: boolean;
  unsubscribed_at?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Send a single subscription to Google Sheets
 */
export async function syncSubscriberToSheets(
  action: 'subscribe' | 'verify' | 'unsubscribe',
  data: SubscriberData
): Promise<boolean> {
  if (!SHEETS_WEBHOOK_URL) {
    console.log('Google Sheets webhook not configured, skipping sync');
    return false;
  }

  try {
    const response = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        secret: SHEETS_WEBHOOK_SECRET,
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Sheets sync failed:', error);
      return false;
    }

    const result = await response.json();
    console.log('Sheets sync success:', result);
    return true;
  } catch (error) {
    console.error('Sheets sync error:', error);
    return false;
  }
}

/**
 * Bulk sync subscribers to Google Sheets
 */
export async function bulkSyncToSheets(subscribers: SubscriberData[]): Promise<{ added: number; skipped: number } | null> {
  if (!SHEETS_WEBHOOK_URL) {
    console.log('Google Sheets webhook not configured, skipping sync');
    return null;
  }

  try {
    const response = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync',
        secret: SHEETS_WEBHOOK_SECRET,
        subscribers,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Bulk sync failed:', error);
      return null;
    }

    const result = await response.json();
    return { added: result.added, skipped: result.skipped };
  } catch (error) {
    console.error('Bulk sync error:', error);
    return null;
  }
}
