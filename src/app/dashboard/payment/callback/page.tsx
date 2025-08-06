
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { verifyPaystackOnServerAndFinalizeOrder } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentCallbackPage() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('Verifying your payment, please wait...');

    useEffect(() => {
        const reference = searchParams.get('reference');

        if (!reference) {
            setStatus('failed');
            setMessage('No payment reference found. Please contact support.');
            return;
        }

        async function verifyPayment() {
            const result = await verifyPaystackOnServerAndFinalizeOrder(reference!);
            if (result.success && result.orderId) {
                setStatus('success');
                setMessage('Payment successful! Your order has been processed.');
                // Notify the opener window and close this one
                if (window.opener) {
                    window.opener.postMessage({ type: 'paymentSuccess', orderId: result.orderId }, '*');
                    setTimeout(() => window.close(), 1500);
                }
            } else {
                setStatus('failed');
                setMessage(result.error || 'Payment verification failed. Please contact support.');
            }
        }

        verifyPayment();

    }, [searchParams]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    {status === 'processing' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
                    {status === 'success' && <CheckCircle className="mx-auto h-12 w-12 text-green-500" />}
                    {status === 'failed' && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
                    <CardTitle className="mt-4">{
                        status === 'processing' ? 'Processing Payment' :
                        status === 'success' ? 'Payment Successful' :
                        'Payment Failed'
                    }</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        {message}
                    </CardDescription>
                     {status === 'success' && <p className="text-sm text-muted-foreground mt-2">This window will close automatically.</p>}
                </CardContent>
            </Card>
        </main>
    );
}

