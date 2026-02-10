/**
 * The Jam - Email Subscriber Sync
 * Google Apps Script for receiving email signups via webhook
 * 
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this entire code
 * 4. Click Deploy → New deployment
 * 5. Select type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Deploy and copy the URL
 * 9. Add the URL to The Jam as GOOGLE_SHEETS_WEBHOOK_URL
 * 
 * QUOTA-CONSCIOUS DESIGN:
 * - Batch writes where possible
 * - Uses PropertiesService for simple caching
 * - Minimal API calls per request
 */

// Configuration
const CONFIG = {
  SHEETS: {
    SUBSCRIBERS: 'Subscribers',
    LOGS: 'Logs'
  },
  HEADERS: {
    SUBSCRIBERS: ['email', 'type', 'source', 'subscribed_at', 'verified', 'verified_at', 'unsubscribed', 'unsubscribed_at', 'ip_address', 'user_agent'],
    LOGS: ['timestamp', 'action', 'email', 'details']
  },
  // Secret key to validate incoming webhooks (set this after deployment)
  WEBHOOK_SECRET: PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET') || ''
};

/**
 * Initialize sheets with headers - run this once manually or auto-runs on first webhook
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create/setup Subscribers sheet
  let subscribersSheet = ss.getSheetByName(CONFIG.SHEETS.SUBSCRIBERS);
  if (!subscribersSheet) {
    subscribersSheet = ss.insertSheet(CONFIG.SHEETS.SUBSCRIBERS);
  }
  
  // Check if headers exist
  const existingHeaders = subscribersSheet.getRange(1, 1, 1, CONFIG.HEADERS.SUBSCRIBERS.length).getValues()[0];
  if (existingHeaders[0] !== CONFIG.HEADERS.SUBSCRIBERS[0]) {
    subscribersSheet.getRange(1, 1, 1, CONFIG.HEADERS.SUBSCRIBERS.length).setValues([CONFIG.HEADERS.SUBSCRIBERS]);
    subscribersSheet.getRange(1, 1, 1, CONFIG.HEADERS.SUBSCRIBERS.length).setFontWeight('bold');
    subscribersSheet.setFrozenRows(1);
  }
  
  // Create/setup Logs sheet
  let logsSheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(CONFIG.SHEETS.LOGS);
  }
  
  const existingLogHeaders = logsSheet.getRange(1, 1, 1, CONFIG.HEADERS.LOGS.length).getValues()[0];
  if (existingLogHeaders[0] !== CONFIG.HEADERS.LOGS[0]) {
    logsSheet.getRange(1, 1, 1, CONFIG.HEADERS.LOGS.length).setValues([CONFIG.HEADERS.LOGS]);
    logsSheet.getRange(1, 1, 1, CONFIG.HEADERS.LOGS.length).setFontWeight('bold');
    logsSheet.setFrozenRows(1);
  }
  
  // Delete default Sheet1 if it exists and is empty
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() <= 1) {
    try {
      ss.deleteSheet(sheet1);
    } catch (e) {
      // Can't delete if it's the only sheet, ignore
    }
  }
  
  return { subscribersSheet, logsSheet };
}

/**
 * Handle POST requests (webhook receiver)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate webhook secret if configured
    if (CONFIG.WEBHOOK_SECRET && data.secret !== CONFIG.WEBHOOK_SECRET) {
      return createResponse({ error: 'Invalid secret' }, 401);
    }
    
    // Initialize sheets if needed
    const { subscribersSheet, logsSheet } = initializeSheets();
    
    // Route based on action
    switch (data.action) {
      case 'subscribe':
        return handleSubscribe(subscribersSheet, logsSheet, data);
      case 'verify':
        return handleVerify(subscribersSheet, logsSheet, data);
      case 'unsubscribe':
        return handleUnsubscribe(subscribersSheet, logsSheet, data);
      case 'sync':
        return handleBulkSync(subscribersSheet, logsSheet, data);
      default:
        return createResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return createResponse({ error: error.message }, 500);
  }
}

/**
 * Handle GET requests (health check)
 */
function doGet(e) {
  initializeSheets();
  return createResponse({ 
    status: 'ok', 
    message: 'The Jam Email Sync is running',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle new subscription
 */
function handleSubscribe(subscribersSheet, logsSheet, data) {
  const { email, type, source, ip_address, user_agent, subscribed_at } = data;
  
  if (!email || !type) {
    return createResponse({ error: 'Missing email or type' }, 400);
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check for existing subscription (email + type combo)
  const existingRow = findSubscription(subscribersSheet, normalizedEmail, type);
  
  if (existingRow) {
    // Update existing - might be re-subscribing
    const rowNum = existingRow.row;
    subscribersSheet.getRange(rowNum, 4).setValue(subscribed_at || new Date().toISOString()); // subscribed_at
    subscribersSheet.getRange(rowNum, 7).setValue(''); // clear unsubscribed
    subscribersSheet.getRange(rowNum, 8).setValue(''); // clear unsubscribed_at
    
    logAction(logsSheet, 'resubscribe', normalizedEmail, `Type: ${type}, Source: ${source}`);
    return createResponse({ success: true, action: 'resubscribed' });
  }
  
  // New subscription
  const newRow = [
    normalizedEmail,
    type,
    source || 'unknown',
    subscribed_at || new Date().toISOString(),
    '', // verified
    '', // verified_at
    '', // unsubscribed
    '', // unsubscribed_at
    ip_address || '',
    user_agent || ''
  ];
  
  subscribersSheet.appendRow(newRow);
  logAction(logsSheet, 'subscribe', normalizedEmail, `Type: ${type}, Source: ${source}`);
  
  return createResponse({ success: true, action: 'subscribed' });
}

/**
 * Handle email verification
 */
function handleVerify(subscribersSheet, logsSheet, data) {
  const { email, type } = data;
  const normalizedEmail = email.toLowerCase().trim();
  
  const existingRow = findSubscription(subscribersSheet, normalizedEmail, type || 'newsletter');
  
  if (!existingRow) {
    return createResponse({ error: 'Subscription not found' }, 404);
  }
  
  subscribersSheet.getRange(existingRow.row, 5).setValue('TRUE'); // verified
  subscribersSheet.getRange(existingRow.row, 6).setValue(new Date().toISOString()); // verified_at
  
  logAction(logsSheet, 'verify', normalizedEmail, `Type: ${type}`);
  
  return createResponse({ success: true, action: 'verified' });
}

/**
 * Handle unsubscription
 */
function handleUnsubscribe(subscribersSheet, logsSheet, data) {
  const { email, type } = data;
  const normalizedEmail = email.toLowerCase().trim();
  
  // If type specified, unsubscribe from that type only
  // If no type, unsubscribe from all
  if (type) {
    const existingRow = findSubscription(subscribersSheet, normalizedEmail, type);
    if (existingRow) {
      subscribersSheet.getRange(existingRow.row, 7).setValue('TRUE'); // unsubscribed
      subscribersSheet.getRange(existingRow.row, 8).setValue(new Date().toISOString()); // unsubscribed_at
    }
  } else {
    // Unsubscribe from all
    const allRows = findAllSubscriptions(subscribersSheet, normalizedEmail);
    allRows.forEach(row => {
      subscribersSheet.getRange(row, 7).setValue('TRUE');
      subscribersSheet.getRange(row, 8).setValue(new Date().toISOString());
    });
  }
  
  logAction(logsSheet, 'unsubscribe', normalizedEmail, `Type: ${type || 'all'}`);
  
  return createResponse({ success: true, action: 'unsubscribed' });
}

/**
 * Handle bulk sync from Supabase
 */
function handleBulkSync(subscribersSheet, logsSheet, data) {
  const { subscribers } = data;
  
  if (!Array.isArray(subscribers)) {
    return createResponse({ error: 'subscribers must be an array' }, 400);
  }
  
  // Get existing data for deduplication
  const lastRow = subscribersSheet.getLastRow();
  const existingData = lastRow > 1 
    ? subscribersSheet.getRange(2, 1, lastRow - 1, 2).getValues()
    : [];
  
  const existingSet = new Set(existingData.map(row => `${row[0]}|${row[1]}`));
  
  // Filter new subscribers
  const newRows = subscribers
    .filter(sub => !existingSet.has(`${sub.email.toLowerCase()}|${sub.type}`))
    .map(sub => [
      sub.email.toLowerCase().trim(),
      sub.type || 'newsletter',
      sub.source || 'sync',
      sub.subscribed_at || new Date().toISOString(),
      sub.verified ? 'TRUE' : '',
      sub.verified_at || '',
      sub.unsubscribed ? 'TRUE' : '',
      sub.unsubscribed_at || '',
      sub.ip_address || '',
      sub.user_agent || ''
    ]);
  
  // Batch append (quota efficient)
  if (newRows.length > 0) {
    subscribersSheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  logAction(logsSheet, 'bulk_sync', '-', `Synced ${newRows.length} new, ${subscribers.length - newRows.length} duplicates skipped`);
  
  return createResponse({ 
    success: true, 
    action: 'synced',
    added: newRows.length,
    skipped: subscribers.length - newRows.length
  });
}

/**
 * Find a specific subscription by email and type
 */
function findSubscription(sheet, email, type) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  
  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase() && data[i][1] === type) {
      return { row: i + 2, data: data[i] };
    }
  }
  
  return null;
}

/**
 * Find all subscriptions for an email
 */
function findAllSubscriptions(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rows = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      rows.push(i + 2);
    }
  }
  
  return rows;
}

/**
 * Log an action
 */
function logAction(logsSheet, action, email, details) {
  logsSheet.appendRow([
    new Date().toISOString(),
    action,
    email,
    details
  ]);
  
  // Trim logs to last 1000 entries (quota conscious)
  const lastRow = logsSheet.getLastRow();
  if (lastRow > 1001) {
    logsSheet.deleteRows(2, lastRow - 1001);
  }
}

/**
 * Create JSON response
 */
function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manual function to set webhook secret
 * Run this once after deployment: setWebhookSecret('your-secret-here')
 */
function setWebhookSecret(secret) {
  PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET', secret);
  console.log('Webhook secret set successfully');
}

/**
 * Manual function to get subscriber stats
 */
function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SUBSCRIBERS);
  
  if (!sheet) {
    console.log('No subscribers sheet found');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    console.log('No subscribers yet');
    return;
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  const stats = {
    total: data.length,
    verified: data.filter(row => row[4] === 'TRUE').length,
    unsubscribed: data.filter(row => row[6] === 'TRUE').length,
    active: data.filter(row => row[6] !== 'TRUE').length,
    byType: {}
  };
  
  data.forEach(row => {
    const type = row[1] || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });
  
  console.log('Subscriber Stats:', JSON.stringify(stats, null, 2));
  return stats;
}
