
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // This component now only serves to redirect away from the old dynamic route.
    // The actual page logic is in /dashboard/sales-runs/page.tsx
    router.replace('/dashboard/deliveries');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
    </div>
  );
}

    