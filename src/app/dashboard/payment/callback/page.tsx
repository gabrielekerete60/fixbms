

"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection, runTransaction, increment, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';

type VerificationStatus = 'verifying' | 'success' | 'failed' | 'cancelled';
type VerificationResult = {
    status: VerificationStatus;
    message: string;
    orderId?: string;
    runId?: string;
};

type PaymentStatus = {
    status: 'idle' | 'processing' | 'success' | 'failed' | 'cancelled';
    orderId?: string | null;
    message?: string;
}


async function verifyPaystackTransaction(reference: string): Promise<any> {
    const secretKey = process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secretKey) return { status: false, message: "Paystack secret key is not configured." };
    
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
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        
        if (reference) {
            processTransaction(reference);
        } else {
            const status = searchParams.get('payment_status');
            if (status === 'cancelled') {
                 setResult({ status: 'cancelled', message: 'The payment was cancelled.' });
                 localStorage.setItem('paymentStatus', JSON.stringify({ status: 'cancelled', message: 'The payment was cancelled.' }));
                 setTimeout(() => window.close(), 1500);
            } else {
                setResult({ status: 'failed', message: 'No payment reference found.' });
                localStorage.setItem('paymentStatus', JSON.stringify({ status: 'failed', message: 'No payment reference found.' }));
            }
        }
    }, [searchParams]);

    const processTransaction = async (reference: string) => {
        const verificationResponse = await verifyPaystackTransaction(reference);
        
        const metadata = verificationResponse?.data?.metadata || {};
        const orderId = metadata.orderId || reference;
        const runId = metadata.runId;

        if (verificationResponse?.data?.status !== 'success') {
            const failureMessage = verificationResponse.message || 'Payment verification failed.';
            setResult({ status: 'failed', message: failureMessage, orderId });
            localStorage.setItem('paymentStatus', JSON.stringify({ status: 'failed', message: failureMessage, orderId }));
            await deleteDoc(doc(db, 'temp_orders', reference)).catch(console.error);
            setTimeout(() => window.close(), 3000);
            return;
        }

        const tempOrderRef = doc(db, 'temp_orders', reference);
        
        try {
             await runTransaction(db, async (transaction) => {
                const tempOrderDoc = await transaction.get(tempOrderRef);
                if (!tempOrderDoc.exists()) {
                    console.log(`Order ${reference} might have been processed already.`);
                    return;
                }
                const orderData = tempOrderDoc.data();
                
                const expectedAmount = Math.round(orderData.total * 100);
                if (verificationResponse.data.amount !== expectedAmount) {
                    throw new Error(`Amount mismatch. Expected ${expectedAmount}, got ${verificationResponse.data.amount}.`);
                }
                
                if (orderData.isDebtPayment) {
                    transaction.update(doc(db, 'transfers', orderData.runId), { totalCollected: increment(orderData.total) });
                    if (orderData.customerId) {
                        transaction.update(doc(db, 'customers', orderData.customerId), { amountPaid: increment(orderData.total) });
                    }
                } else {
                    const finalOrderRef = doc(db, "orders", orderId);
                    const finalOrderData = {
                        ...orderData,
                        id: orderId,
                        date: Timestamp.now(), // Use Timestamp here
                        paymentMethod: 'Card',
                        status: 'Completed',
                    };
                    delete finalOrderData.createdAt;
                    transaction.set(finalOrderRef, finalOrderData);
                }
                
                transaction.delete(tempOrderRef);
            });
            
            const successMessage = 'Payment successful! Your transaction has been recorded.';
            setResult({ status: 'success', message: successMessage, orderId, runId });
            localStorage.setItem('paymentStatus', JSON.stringify({ status: 'success', orderId, message: successMessage }));
            setTimeout(() => window.close(), 1500);

        } catch (error) {
            console.error("Error completing transaction:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setResult({ status: 'failed', message: `Transaction completion failed: ${errorMessage}`, orderId });
            localStorage.setItem('paymentStatus', JSON.stringify({ status: 'failed', message: `Transaction completion failed: ${errorMessage}`, orderId }));
            setTimeout(() => window.close(), 3000);
        }
    };

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
