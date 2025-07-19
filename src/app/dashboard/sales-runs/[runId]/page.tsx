
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSalesRunDetails, SalesRun, getCreditors as getCustomers, Creditor as Customer } from '@/app/actions';
import { Loader2, ArrowLeft, User, Package, HandCoins } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SalesRunPage() {
    const params = useParams();
    const runId = params.runId as string;
    const [runDetails, setRunDetails] = useState<SalesRun | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!runId) return;

        const fetchData = async () => {
            setIsLoading(true);
            const [runData, customerData] = await Promise.all([
                getSalesRunDetails(runId),
                getCustomers() // Using getCreditors as a stand-in for fetching customers
            ]);
            setRunDetails(runData);
            setCustomers(customerData);
            setIsLoading(false);
        };

        fetchData();
    }, [runId]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    if (!runDetails) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold">Sales Run Not Found</h2>
                <p>The requested sales run could not be found.</p>
                <Link href="/dashboard/deliveries"><Button className="mt-4">Back to Deliveries</Button></Link>
            </div>
        );
    }
    
    const totalItems = runDetails.items.reduce((sum, item) => sum + item.quantity, 0);
    const soldItems = 0; // Placeholder for now
    const progress = totalItems > 0 ? (soldItems / totalItems) * 100 : 0;

    return (
        <div className="flex flex-col gap-6">
            <div>
                 <Button variant="outline" asChild>
                    <Link href="/dashboard/deliveries">
                        <ArrowLeft className="mr-2 h-4 w-4"/> Back to Sales Runs
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Sales Run: {runDetails.id.substring(0, 6).toUpperCase()}</CardTitle>
                    <CardDescription>From: {runDetails.from_staff_name}</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Run Summary</h3>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">Sales Progress</span>
                                <span>{soldItems} / {totalItems} items</span>
                            </div>
                            <Progress value={progress} />
                        </div>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between"><span>Total Revenue:</span><span className="font-semibold">₦{runDetails.totalRevenue.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Total Collected:</span><span className="font-semibold text-green-500">₦{runDetails.totalCollected.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Total Outstanding:</span><span className="font-semibold text-destructive">₦{runDetails.totalOutstanding.toLocaleString()}</span></div>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2">Run Actions</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <Button variant="outline" className="h-20 flex-col gap-1">
                                <User className="h-5 w-5"/>
                                <span>Sell to Customer</span>
                             </Button>
                              <Button variant="outline" className="h-20 flex-col gap-1">
                                <HandCoins className="h-5 w-5"/>
                                <span>Record Payment</span>
                             </Button>
                         </div>
                     </div>
                </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Package/> Items in Run</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runDetails.items.map(item => (
                                    <TableRow key={item.productId}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell className="text-right">₦{item.price.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><User/> Potential Customers / Debtors</CardTitle></CardHeader>
                     <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="text-right">Amount Owing</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length > 0 ? customers.map(cust => (
                                    <TableRow key={cust.id}>
                                        <TableCell>{cust.name}</TableCell>
                                        <TableCell className="text-right text-destructive">₦{cust.balance.toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={2} className="text-center h-24">No customers with outstanding balance.</TableCell></TableRow>
                                )}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

