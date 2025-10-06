
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SalesRunDetailsPageClient } from './client';
import { Loader2 } from 'lucide-react';


function SalesRunPageContent() {
    const searchParams = useSearchParams();
    const runId = searchParams.get('runId');

    if (!runId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <h1 className="text-2xl font-bold">No Sales Run Selected</h1>
                <p className="text-muted-foreground">Please select a sales run from the deliveries page.</p>
            </div>
        );
    }

    // Since we can't fetch server-side with query params in an export build,
    // we pass the ID and let the client component handle all fetching.
    // The `initialRun` prop is now just a placeholder to satisfy the type.
    return <SalesRunDetailsPageClient />;
}

export default function SalesRunPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
        <SalesRunPageContent />
    </Suspense>
  )
}

    