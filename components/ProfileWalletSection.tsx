'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { WalletButton } from './WalletConnect';
import { supabase } from '@/lib/supabase';

export default function ProfileWalletSection() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleWalletConnect = async (address: string, chain: string) => {
    if (!profile) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: address, 
          wallet_chain: chain,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Wallet connected and saved!' });
      refreshProfile?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save wallet' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!profile) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: null, 
          wallet_chain: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Clear local wallet storage
      localStorage.removeItem('jam_wallet');
      
      setMessage({ type: 'success', text: 'Wallet disconnected' });
      refreshProfile?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect wallet' });
    } finally {
      setSaving(false);
    }
  };

  // Already connected in profile
  if (profile?.wallet_address) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-medium">
                {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
              </div>
              <div className="text-zinc-400 text-sm capitalize">{profile.wallet_chain || 'Connected'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          </div>
        </div>
        
        <button
          onClick={handleDisconnect}
          disabled={saving}
          className="text-sm text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {saving ? 'Disconnecting...' : 'Disconnect wallet'}
        </button>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <p className="text-zinc-500 text-sm">
          Prize payouts will be sent to this address on the Base network.
        </p>
      </div>
    );
  }

  // Not connected
  return (
    <div className="space-y-4">
      <p className="text-zinc-400 text-sm mb-4">
        Connect a wallet to receive crypto prize payouts. We support MetaMask, Coinbase Wallet, and Phantom.
      </p>
      
      <WalletButton 
        onConnect={handleWalletConnect}
        className="w-full justify-center py-3"
      />

      {saving && (
        <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving to profile...
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-900/50 border border-green-700 text-green-300'
            : 'bg-red-900/50 border border-red-700 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="pt-2 border-t border-zinc-800">
        <h4 className="text-zinc-300 text-sm font-medium mb-2">Supported wallets:</h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">MetaMask</span>
          <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">Coinbase Wallet</span>
          <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">Phantom</span>
        </div>
      </div>
    </div>
  );
}
