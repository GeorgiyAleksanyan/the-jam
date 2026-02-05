'use client';

import { useEffect, useRef } from 'react';

interface ViewTrackerProps {
  challengeSlug: string;
}

export function ViewTracker({ challengeSlug }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return;
    tracked.current = true;

    // Fire and forget - don't block the page
    fetch(`/api/challenges/${challengeSlug}/view`, {
      method: 'POST',
    }).catch(() => {
      // Silently fail - view tracking is not critical
    });
  }, [challengeSlug]);

  return null;
}
