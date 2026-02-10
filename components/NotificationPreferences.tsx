'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface EmailNotificationPrefs {
  challenge_updates: boolean;
  submission_status: boolean;
  payout_alerts: boolean;
  weekly_digest: boolean;
  marketing: boolean;
}

interface PushNotificationPrefs {
  in_app: boolean;
  browser: boolean;
}

const DEFAULT_EMAIL_PREFS: EmailNotificationPrefs = {
  challenge_updates: true,
  submission_status: true,
  payout_alerts: true,
  weekly_digest: false,
  marketing: false,
};

const DEFAULT_PUSH_PREFS: PushNotificationPrefs = {
  in_app: true,
  browser: false,
};

export default function NotificationPreferences() {
  const { profile, refreshProfile } = useAuth();
  const [emailPrefs, setEmailPrefs] = useState<EmailNotificationPrefs>(DEFAULT_EMAIL_PREFS);
  const [pushPrefs, setPushPrefs] = useState<PushNotificationPrefs>(DEFAULT_PUSH_PREFS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      // Merge saved prefs with defaults (in case new options are added)
      setEmailPrefs({ ...DEFAULT_EMAIL_PREFS, ...(profile.email_notifications || {}) });
      setPushPrefs({ ...DEFAULT_PUSH_PREFS, ...(profile.push_notifications || {}) });
    }
  }, [profile]);

  const handleEmailToggle = (key: keyof EmailNotificationPrefs) => {
    setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePushToggle = (key: keyof PushNotificationPrefs) => {
    setPushPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email_notifications: emailPrefs,
          push_notifications: pushPrefs,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved!' });
        await refreshProfile();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save preferences' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const emailOptions = [
    { key: 'challenge_updates' as const, label: 'Challenge Updates', desc: 'New challenges, status changes, and deadlines' },
    { key: 'submission_status' as const, label: 'Submission Status', desc: 'Updates on your submissions and reviews' },
    { key: 'payout_alerts' as const, label: 'Payout Alerts', desc: 'Payment confirmations and earnings updates' },
    { key: 'weekly_digest' as const, label: 'Weekly Digest', desc: 'Summary of top challenges and platform news' },
    { key: 'marketing' as const, label: 'Marketing & Announcements', desc: 'Product updates, features, and promotions' },
  ];

  const pushOptions = [
    { key: 'in_app' as const, label: 'In-App Notifications', desc: 'Show notifications in the notification bell' },
    { key: 'browser' as const, label: 'Browser Push', desc: 'Desktop notifications when browser is open' },
  ];

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email Notifications
        </h3>
        <div className="space-y-3">
          {emailOptions.map(option => (
            <label key={option.key} className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={emailPrefs[option.key]}
                  onChange={() => handleEmailToggle(option.key)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  emailPrefs[option.key] ? 'bg-blue-600' : 'bg-zinc-700'
                }`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    emailPrefs[option.key] ? 'translate-x-4' : ''
                  }`} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">
                  {option.label}
                </div>
                <div className="text-zinc-500 text-xs">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800" />

      {/* Push Notifications */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Push Notifications
        </h3>
        <div className="space-y-3">
          {pushOptions.map(option => (
            <label key={option.key} className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={pushPrefs[option.key]}
                  onChange={() => handlePushToggle(option.key)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  pushPrefs[option.key] ? 'bg-blue-600' : 'bg-zinc-700'
                }`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    pushPrefs[option.key] ? 'translate-x-4' : ''
                  }`} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">
                  {option.label}
                </div>
                <div className="text-zinc-500 text-xs">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        {message && (
          <div className={`mb-3 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 px-6 rounded-lg transition"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
