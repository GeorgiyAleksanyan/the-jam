'use client';

import { useState } from 'react';

type RentModalProps = {
  agent: {
    id: number;
    name: string;
    slug: string;
    rental: {
      pricing_model: string;
      hourly_rate: number | null;
      task_rate_min: number | null;
      task_rate_max: number | null;
      monthly_rate: number | null;
      accepts_crypto: boolean;
      accepts_fiat: boolean;
      requires_approval: boolean;
    };
  };
  onClose: () => void;
  onSuccess: (rental: any) => void;
};

export default function RentModal({ agent, onClose, onSuccess }: RentModalProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>(
    agent.rental.accepts_crypto ? 'crypto' : 'fiat'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePrice = () => {
    const r = agent.rental;
    if (r.pricing_model === 'hourly' && r.hourly_rate) {
      return r.hourly_rate * estimatedHours;
    }
    if (r.pricing_model === 'task' && r.task_rate_min) {
      return r.task_rate_min;
    }
    if (r.pricing_model === 'subscription' && r.monthly_rate) {
      return r.monthly_rate;
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agent.id,
          pricing_model: agent.rental.pricing_model,
          task_description: taskDescription,
          estimated_hours: agent.rental.pricing_model === 'hourly' ? estimatedHours : undefined,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create rental request');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const price = calculatePrice();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-lg w-full border border-zinc-800 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold text-white">Rent {agent.name}</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {agent.rental.requires_approval
              ? 'Your request will be sent to the agent owner for approval.'
              : 'This rental will be processed immediately.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              What do you need done?
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe the task or project you need help with..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={4}
              required
            />
          </div>

          {/* Hourly Estimate (if hourly pricing) */}
          {agent.rental.pricing_model === 'hourly' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-zinc-500 text-xs mt-1">
                You&apos;ll only be charged for actual hours used.
              </p>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Payment Method
            </label>
            <div className="flex gap-4">
              {agent.rental.accepts_crypto && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="crypto"
                    checked={paymentMethod === 'crypto'}
                    onChange={() => setPaymentMethod('crypto')}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-300">💎 USDC (Crypto)</span>
                </label>
              )}
              {agent.rental.accepts_fiat && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="fiat"
                    checked={paymentMethod === 'fiat'}
                    onChange={() => setPaymentMethod('fiat')}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-300">💳 Card (Stripe)</span>
                </label>
              )}
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Estimated Total</span>
              <span className="text-2xl font-bold text-white">
                ${price.toFixed(2)}
              </span>
            </div>
            <p className="text-zinc-500 text-xs mt-2">
              {agent.rental.pricing_model === 'hourly'
                ? 'Based on estimated hours. Final price may vary.'
                : agent.rental.pricing_model === 'task'
                ? 'Starting price. May be adjusted based on scope.'
                : 'Monthly subscription rate.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !taskDescription.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : agent.rental.requires_approval ? 'Request Rental' : 'Rent Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
