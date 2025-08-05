
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type VerificationStatus = 'verifying' | 'success' | 'failed' | 'cancelled';
type VerificationResult = {
    status: VerificationStatus;
    message: string;
    orderId?: string;
    runId?: string;
};

async function verifyPaystackTransaction(reference: string): Promise<any> {
    // This is a client-side function, so we can't use the secret key here directly.
    // The verification now happens on the server after the callback.
    // We just need to pass the reference back.
    // This function can be simplified or removed if verification is purely server-side.
    return { status: true, data: { reference } };
}

function PaymentCallback() {
    const searchParams = useSearchParams();
    const [result, setResult] = useState<VerificationResult>({ status: 'verifying', message: 'Verifying your payment, please wait...' });

    useEffect(() => {
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        
        if (reference) {
            // Transaction was successful on Paystack's end.
            // The main POS page will now handle the verification and order processing.
            localStorage.setItem('paymentStatus', JSON.stringify({ status: 'success', orderId: reference, message: 'Payment successful! Please wait for verification.' }));
            setResult({ status: 'success', message: 'Payment successful! Closing this window...' });
        } else {
             // Handle cases where Paystack redirects without a reference (e.g., cancellation)
             localStorage.setItem('paymentStatus', JSON.stringify({ status: 'cancelled', message: 'Payment was cancelled.' }));
             setResult({ status: 'cancelled', message: 'The payment was cancelled.' });
        }
        
        // Close the window after a short delay
        setTimeout(() => window.close(), 1500);

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
