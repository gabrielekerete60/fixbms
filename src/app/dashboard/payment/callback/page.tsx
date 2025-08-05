
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { verifyPaystackOnServerAndFinalizeOrder } from '@/app/actions';

type VerificationStatus = 'verifying' | 'success' | 'failed' | 'cancelled';
type VerificationResult = {
    status: VerificationStatus;
    message: string;
    orderId?: string;
};

function PaymentCallback() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [result, setResult] = useState<VerificationResult>({ status: 'verifying', message: 'Verifying your payment, please wait...' });

    useEffect(() => {
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        
        const handleVerification = async () => {
            if (!reference) {
                setResult({ status: 'cancelled', message: 'The payment was cancelled or failed.' });
                return;
            }

            const finalizationResult = await verifyPaystackOnServerAndFinalizeOrder(reference);

            if (finalizationResult.success) {
                 setResult({ status: 'success', message: 'Payment successful and order recorded! Closing this window...', orderId: finalizationResult.orderId });
                 toast({ title: 'Payment Confirmed', description: 'Your order has been successfully placed.' });
                 // Notify the opening window
                 if (window.opener) {
                     window.opener.postMessage({ type: 'paymentSuccess', orderId: finalizationResult.orderId }, '*');
                 }
            } else {
                 setResult({ status: 'failed', message: finalizationResult.error || 'There was a problem recording your order. Please contact support.' });
                 toast({ variant: 'destructive', title: 'Order Recording Failed', description: finalizationResult.error });
            }

            // Close the window after a short delay
            setTimeout(() => window.close(), 3000);
        }

        handleVerification();

    // We only want this to run once when the page loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    {result.status === 'verifying' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
                    {result.status === 'success' && <CheckCircle className="mx-auto h-12 w-12 text-green-500" />}
                    {result.status === 'failed' && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
                    {result.status === 'cancelled' && <XCircle className="mx-auto h-12 w-12 text-yellow-500" />}
                    <CardTitle className="mt-4">{
                        {
                            verifying: 'Processing Payment',
                            success: 'Payment Successful',
                            failed: 'Payment Failed',
                            cancelled: 'Payment Cancelled'
                        }[result.status]
                    }</CardTitle>
                    <CardDescription>{result.message}</CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="text-xs text-center text-muted-foreground">This window will close automatically.</p>
                </CardContent>
            </Card>
        </main>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <PaymentCallback />
        </Suspense>
    );
}
