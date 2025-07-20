
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection, runTransaction, increment, deleteDoc, updateDoc } from 'firebase/firestore';

type VerificationStatus = 'verifying' | 'success' | 'failed' | 'cancelled';
type VerificationResult = {
    status: VerificationStatus;
    message: string;
    orderId?: string;
    runId?: string;
};

async function verifyPaystackTransaction(reference: string): Promise<any> {
    // This function should be a server action for security, but for simplicity we keep it here.
    // In a real app, move this to a server action and call it.
    const secretKey = process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    const url = `https://api.paystack.co/transaction/verify/${reference}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${secretKey}`,
            },
        });
        return await response.json();
    } catch (error) {
        console.error("Verification connection error:", error);
        return { status: false, message: "Failed to connect to Paystack for verification." };
    }
}

function PaymentCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [result, setResult] = useState<VerificationResult>({ status: 'verifying', message: 'Verifying your payment, please wait...' });

    useEffect(() => {
        const reference = searchParams.get('reference');
        
        const trxref = searchParams.get('trxref');
        if (!reference && trxref) {
            // Paystack uses 'trxref' as well, handle both cases.
             processTransaction(trxref);
        } else if (reference) {
            processTransaction(reference);
        } else {
             setResult({ status: 'failed', message: 'No payment reference found.' });
        }
    }, [searchParams]);

    const processTransaction = async (reference: string) => {
        const verificationResponse = await verifyPaystackTransaction(reference);
        
        const metadata = verificationResponse?.data?.metadata || {};
        const orderId = metadata.orderId || reference;
        const runId = metadata.runId;

        if (verificationResponse?.data?.status !== 'success') {
            setResult({ status: 'failed', message: verificationResponse.message || 'Payment verification failed.', orderId });
            const tempOrderRef = doc(db, 'temp_orders', reference);
            await deleteDoc(tempOrderRef).catch(console.error);
            return;
        }

        const tempOrderRef = doc(db, 'temp_orders', reference);
        
        try {
             await runTransaction(db, async (transaction) => {
                const tempOrderDoc = await transaction.get(tempOrderRef);
                if (!tempOrderDoc.exists()) {
                    // It might have been processed already, which is not an error in this context.
                    // We can assume success and redirect.
                    console.log(`Order ${reference} already processed.`);
                    return;
                }
                const orderData = tempOrderDoc.data();
                
                const expectedAmount = Math.round(orderData.total * 100);
                if (verificationResponse.data.amount !== expectedAmount) {
                    throw new Error(`Amount mismatch. Expected ${expectedAmount}, got ${verificationResponse.data.amount}.`);
                }
                
                if (orderData.isDebtPayment) {
                    // This is a payment for an existing debt
                    const runRef = doc(db, 'transfers', orderData.runId);
                    transaction.update(runRef, { totalCollected: increment(orderData.total) });

                    if (orderData.customerId) {
                        const customerRef = doc(db, 'customers', orderData.customerId);
                        transaction.update(customerRef, { amountPaid: increment(orderData.total) });
                    }
                } else {
                    // This is a new sale from POS
                    const finalOrderRef = doc(db, "orders", orderId);
                    transaction.set(finalOrderRef, {
                        ...orderData,
                        paymentMethod: 'Card',
                        status: 'Completed',
                        id: orderId,
                    });

                     // No stock deduction here because it's a POS sale from personal inventory.
                     // The temp_order is just for paystack reference.
                     // A real order will be created upon confirmation.
                }
                
                transaction.delete(tempOrderRef);
            });
            
            setResult({ status: 'success', message: 'Payment successful! Your transaction has been recorded.', orderId, runId });

        } catch (error) {
            console.error("Error completing transaction:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setResult({ status: 'failed', message: `Transaction completion failed: ${errorMessage}`, orderId });
        }
    };
    
    const handleReturn = () => {
        if (result.status === 'success') {
            // For POS sales, redirect back to POS page with params to trigger receipt.
            if (!result.runId) {
                router.push(`/dashboard/pos?payment_status=success&order_id=${result.orderId}`);
            } else {
            // For debt payments from a sales run, redirect to that run's page.
                router.push(`/dashboard/sales-runs/${result.runId}`);
            }
        } else {
            router.back();
        }
    }

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
                    {result.status !== 'verifying' && (
                        <Button onClick={handleReturn} className="w-full">Continue</Button>
                    )}
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
