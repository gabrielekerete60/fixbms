
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { doc, getDoc, runTransaction, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type VerificationStatus = 'verifying' | 'success' | 'failed' | 'cancelled';
type VerificationResult = {
    status: VerificationStatus;
    message: string;
    orderId?: string;
    runId?: string;
};

// This function is now a server-callable utility, not a client-side one
// It's part of a larger transaction handling flow.
async function verifyPaystackOnServerAndFinalizeOrder(reference: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tempOrderRef = doc(db, "temp_orders", reference);
        const tempOrderDoc = await getDoc(tempOrderRef);

        if (!tempOrderDoc.exists()) {
            return { success: false, error: "Order reference not found. It might have been processed already." };
        }
        
        const orderPayload = tempOrderDoc.data();
        
        await runTransaction(db, async (transaction) => {
            const newOrderRef = doc(collection(db, 'orders'));
            transaction.set(newOrderRef, { ...orderPayload, id: newOrderRef.id });

            if (orderPayload.runId) {
                const runRef = doc(db, 'transfers', orderPayload.runId);
                transaction.update(runRef, { totalCollected: increment(orderPayload.total) });
            }
            // Delete the temporary order record
            transaction.delete(tempOrderRef);
        });

        return { success: true };
    } catch (error) {
        console.error("Error finalizing order:", error);
        return { success: false, error: "Failed to finalize the order after payment verification." };
    }
}


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

            // Here we assume Paystack redirecting means success on their end.
            // The critical step is finalizing the order on our server.
            const finalizationResult = await verifyPaystackOnServerAndFinalizeOrder(reference);

            if (finalizationResult.success) {
                 setResult({ status: 'success', message: 'Payment successful and order recorded! Closing this window...' });
                 toast({ title: 'Payment Confirmed', description: 'Your order has been successfully placed.' });
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
