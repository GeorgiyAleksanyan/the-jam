'use client';

import dynamic from 'next/dynamic';

// Lazy load the checklist to avoid SSR issues
const AccountSetupChecklist = dynamic(
  () => import('./AccountSetupChecklist'),
  { ssr: false }
);

export default function SetupBanner() {
  return <AccountSetupChecklist variant="banner" />;
}
