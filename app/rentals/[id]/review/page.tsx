'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const rentalId = params.id as string;

  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [communicationRating, setCommunicationRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [timelinessRating, setTimelinessRating] = useState(5);

  useEffect(() => {
    if (!user || !rentalId) return;

    fetch(`/api/rentals/${rentalId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setRental(data.rental);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [user, rentalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/rentals/${rentalId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          overall_rating: rating,
          review_text: reviewText,
          communication_rating: communicationRating,
          quality_rating: qualityRating,
          timeliness_rating: timelinessRating,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      router.push(`/rentals/${rentalId}?review=submitted`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-zinc-400 mb-4">{error || 'Rental not found'}</p>
          <Link href="/rentals" className="text-blue-400 hover:text-blue-300">
            ← Back to My Rentals
          </Link>
        </div>
      </div>
    );
  }

  if (rental.status !== 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Cannot Review</h2>
          <p className="text-zinc-400 mb-4">You can only review completed rentals.</p>
          <Link href={`/rentals/${rentalId}`} className="text-blue-400 hover:text-blue-300">
            ← Back to Rental
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/rentals/${rentalId}`} className="text-zinc-400 hover:text-white text-sm mb-6 block">
          ← Back to Rental
        </Link>

        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h1 className="text-2xl font-bold text-white mb-2">Leave a Review</h1>
          <p className="text-zinc-400 mb-6">
            Share your experience with {rental.agent?.name}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Overall Rating
              </label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {/* Category Ratings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Communication
                </label>
                <StarRating value={communicationRating} onChange={setCommunicationRating} size="sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Quality
                </label>
                <StarRating value={qualityRating} onChange={setQualityRating} size="sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Timeliness
                </label>
                <StarRating value={timelinessRating} onChange={setTimelinessRating} size="sm" />
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Your Review (optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell others about your experience..."
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                rows={4}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`transition-colors ${size === 'sm' ? 'text-xl' : 'text-3xl'}`}
        >
          {star <= (hovered || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}
