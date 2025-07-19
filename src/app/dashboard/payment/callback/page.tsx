
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection, runTransaction, increment } from 'firebase/firestore';

type VerificationStatus = 'verifying' | 'success' | 'failed';
type VerificationResult = {
    status: VerificationStatus;
    message: string;
    orderId?: string;
};

async function verifyPaystackTransaction(reference: string): Promise<any> {
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
        if (!reference) {
            setResult({ status: 'failed', message: 'No payment reference found.' });
            return;
        }

        const completeTransaction = async () => {
            const verificationResponse = await verifyPaystackTransaction(reference);

            if (verificationResponse?.data?.status !== 'success') {
                setResult({ status: 'failed', message: verificationResponse.message || 'Payment verification failed.' });
                // Optionally delete the temp_order
                const tempOrderRef = doc(db, 'temp_orders', reference);
                await deleteDoc(tempOrderRef);
                return;
            }

            const tempOrderRef = doc(db, 'temp_orders', reference);
            
            try {
                 await runTransaction(db, async (transaction) => {
                    const tempOrderDoc = await transaction.get(tempOrderRef);
                    if (!tempOrderDoc.exists()) {
                        throw new Error("Order details not found or already processed.");
                    }
                    const orderData = tempOrderDoc.data();

                    // Verify amount
                    const expectedAmount = Math.round(orderData.total * 100);
                    if (verificationResponse.data.amount !== expectedAmount) {
                        throw new Error(`Amount mismatch. Expected ${expectedAmount}, got ${verificationResponse.data.amount}.`);
                    }

                    // Decrement stock
                    for (const item of orderData.items) {
                        const personalStockRef = doc(db, 'staff', orderData.staff_id, 'personal_stock', item.id);
                        const personalStockDoc = await transaction.get(personalStockRef);
                        if (!personalStockDoc.exists() || personalStockDoc.data().stock < item.quantity) {
                            throw new Error(`Not enough stock for ${item.name}.`);
                        }
                        transaction.update(personalStockRef, { stock: increment(-item.quantity) });
                    }
                    
                    // Create permanent order record
                    const finalOrderRef = doc(db, "orders", reference);
                    transaction.set(finalOrderRef, {
                        ...orderData,
                        paymentMethod: 'Card',
                        status: 'Completed',
                        id: reference,
                    });
                    
                    // Delete temporary order record
                    transaction.delete(tempOrderRef);
                });
                
                setResult({ status: 'success', message: 'Payment successful! Your order has been placed.', orderId: reference });

            } catch (error) {
                console.error("Error completing transaction:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setResult({ status: 'failed', message: `Transaction completion failed: ${errorMessage}`, orderId: reference });
            }
        };

        completeTransaction();

    }, [searchParams]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    {result.status === 'verifying' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
                    {result.status === 'success' && <CheckCircle className="mx-auto h-12 w-12 text-green-500" />}
                    {result.status === 'failed' && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
                    <CardTitle className="mt-4">{
                        {
                            verifying: 'Processing Payment',
                            success: 'Payment Successful',
                            failed: 'Payment Failed'
                        }[result.status]
                    }</CardTitle>
                    <CardDescription>{result.message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => router.push('/dashboard/pos')}>
                        Back to POS
                    </Button>
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
