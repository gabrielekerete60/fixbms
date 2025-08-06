
"use client";

import { useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { verifyPaystackOnServerAndFinalizeOrder } from '@/app/actions';

function CallbackContent() {
    const searchParams = useSearchParams();

    const handleVerification = useCallback(async (reference: string) => {
        // Perform the server-side verification and order finalization
        const result = await verifyPaystackOnServerAndFinalizeOrder(reference);
        
        // Check if the window has an opener (the main POS window)
        if (window.opener) {
            // Send a message back to the opener window with the result
            if (result.success && result.orderId) {
                window.opener.postMessage({ type: 'paymentSuccess', orderId: result.orderId }, window.location.origin);
            } else {
                window.opener.postMessage({ type: 'paymentError', error: result.error || 'Verification failed.' }, window.location.origin);
            }
            // Close the popup window
            window.close();
        }
    }, []);

    useEffect(() => {
        const reference = searchParams.get('reference');
        if (reference) {
            handleVerification(reference);
        } else {
            // If there's no reference, signal an error and close
            if (window.opener) {
                window.opener.postMessage({ type: 'paymentError', error: 'No transaction reference found.' }, window.location.origin);
            }
            window.close();
        }
    }, [searchParams, handleVerification]);

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Verifying payment, please wait...</p>
            <p className="text-sm text-muted-foreground">This window will close automatically.</p>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Loading...</p>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
