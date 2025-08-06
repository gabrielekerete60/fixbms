
"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { verifyPaystackOnServerAndFinalizeOrder } from '@/app/actions';

function CallbackContent() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const reference = searchParams.get('reference');

        if (reference) {
            verifyPaystackOnServerAndFinalizeOrder(reference).then(result => {
                if (result.success && result.orderId) {
                    // Send success message to the opener window
                    if (window.opener) {
                        window.opener.postMessage({ type: 'paymentSuccess', orderId: result.orderId }, window.location.origin);
                    }
                } else {
                     if (window.opener) {
                        window.opener.postMessage({ type: 'paymentError', error: result.error }, window.location.origin);
                    }
                }
                // Close the popup window
                window.close();
            });
        } else {
            if (window.opener) {
                window.opener.postMessage({ type: 'paymentError', error: 'No transaction reference found.' }, window.location.origin);
            }
            window.close();
        }
    }, [searchParams]);

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
        <Suspense fallback={<div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p>Loading...</p></div>}>
            <CallbackContent />
        </Suspense>
    );
}
