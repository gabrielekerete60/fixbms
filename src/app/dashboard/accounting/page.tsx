"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2, DollarSign, Receipt, TrendingDown, TrendingUp, PenSquare, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFinancialSummary, getDebtRecords, getDirectCosts, getIndirectCosts, getClosingStocks, getWages, addDirectCost, addIndirectCost, getSales, getDrinkSales, PaymentConfirmation, getPaymentConfirmations, handlePaymentConfirmation } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// --- Helper Functions & Type Definitions ---
const formatCurrency = (amount?: number) => `₦${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FinancialSummary = { totalRevenue: number; totalExpenditure: number; grossProfit: number; netProfit: number; };
type DebtRecord = { id: string; date: string; description: string; debit: number; credit: number; };
type DirectCost = { id: string; date: string; description: string; category: string; quantity: number; total: number; };
type IndirectCost = { id: string; date: string; description: string; category: string; amount: number; };
type ClosingStock = { id: string; item: string; remainingStock: string; amount: number; };
type Wage = { id: string; name: string; department: string; position: string; salary: number; deductions: { shortages: number; advanceSalary: number }; netPay: number; };
type Sale = { id: string; date: string; description: string; cash: number; transfer: number; pos: number; creditSales: number; shortage: number; total: number; };
type DrinkSale = { id: string; drinkType: string; amountPurchases: number; quantitySold: number; sellingPrice: number; amount: number; };

// --- DIALOGS FOR ADDING DATA ---

function AddDirectCostDialog({ onCostAdded }: { onCostAdded: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState<number | string>('');
    const [total, setTotal] = useState<number | string>('');

    const handleSubmit = async () => {
        if (!description || !category || !quantity || !total) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
            return;
        }
        setIsLoading(true);
        const result = await addDirectCost({ description, category, quantity: Number(quantity), total: Number(total) });
        if (result.success) {
            toast({ title: 'Success', description: 'Direct cost added.' });
            onCostAdded();
            setIsOpen(false);
            setDescription(''); setCategory(''); setQuantity(''); setTotal('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><PenSquare className="mr-2 h-4 w-4" /> Add Direct Cost</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Direct Cost</DialogTitle>
                    <DialogDescription>Record a cost directly related to production, like raw materials.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Bag of Flour" /></div>
                    <div className="grid gap-2"><Label>Category</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Flour" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Quantity</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                        <div className="grid gap-2"><Label>Total Cost (₦)</Label><Input type="number" value={total} onChange={e => setTotal(e.target.value)} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Cost</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddIndirectCostDialog({ onCostAdded }: { onCostAdded: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState<number | string>('');

    const handleSubmit = async () => {
        if (!description || !category || !amount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
            return;
        }
        setIsLoading(true);
        const result = await addIndirectCost({ description, category, amount: Number(amount) });
        if (result.success) {
            toast({ title: 'Success', description: 'Indirect cost added.' });
            onCostAdded();
            setIsOpen(false);
            setDescription(''); setCategory(''); setAmount('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><PenSquare className="mr-2 h-4 w-4" /> Add Indirect Cost</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Indirect Cost</DialogTitle>
                    <DialogDescription>Record an operational cost not directly tied to a product, like rent or utilities.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Diesel for Generator" /></div>
                    <div className="grid gap-2"><Label>Category</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Utilities" /></div>
                    <div className="grid gap-2"><Label>Amount (₦)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Cost</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Tab Components ---

function SummaryTab() {
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getFinancialSummary().then(data => {
            setSummary(data);
            setIsLoading(false);
        });
    }, []);

    if (isLoading || !summary) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Expenditure</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.totalExpenditure)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gross Profit</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.grossProfit)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Net Profit</CardTitle><Receipt className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-500">{formatCurrency(summary.netProfit)}</div></CardContent>
            </Card>
        </div>
    );
}

function DebtTab() {
    const [records, setRecords] = useState<DebtRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getDebtRecords().then(data => {
            setRecords(data as DebtRecord[]);
            setIsLoading(false);
        });
    }, []);

    const totals = useMemo(() => records.reduce((acc, rec) => { acc.debit += rec.debit; acc.credit += rec.credit; return acc; }, { debit: 0, credit: 0 }), [records]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card><CardHeader><CardTitle>Debtors & Creditors</CardTitle><CardDescription>Manage all money owed to and by the bakery.</CardDescription></CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit (Owed to Us)</TableHead><TableHead className="text-right">Credit (We Owe)</TableHead></TableRow></TableHeader>
                        <TableBody>{records.map(rec => (<TableRow key={rec.id}><TableCell>{format(new Date(rec.date), 'PPP')}</TableCell><TableCell>{rec.description}</TableCell><TableCell className="text-right">{formatCurrency(rec.debit)}</TableCell><TableCell className="text-right">{formatCurrency(rec.credit)}</TableCell></TableRow>))}</TableBody>
                        <TableFooter><TableRow><TableCell colSpan={2} className="text-right font-bold">Totals</TableCell><TableCell className="text-right font-bold">{formatCurrency(totals.debit)}</TableCell><TableCell className="text-right font-bold">{formatCurrency(totals.credit)}</TableCell></TableRow></TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function DirectCostsTab() {
    const [costs, setCosts] = useState<DirectCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fetchCosts = () => { setIsLoading(true); getDirectCosts().then(data => { setCosts(data as DirectCost[]); setIsLoading(false); }); };
    useEffect(() => { fetchCosts(); }, []);
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between"><div className="space-y-1.5"><CardTitle>Direct Costs</CardTitle><CardDescription>Costs directly tied to production, like ingredients.</CardDescription></div><AddDirectCostDialog onCostAdded={fetchCosts} /></CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{costs.map(c => <TableRow key={c.id}><TableCell>{format(new Date(c.date), 'PPP')}</TableCell><TableCell>{c.description}</TableCell><TableCell>{c.category}</TableCell><TableCell className="text-right">{c.quantity}</TableCell><TableCell className="text-right">{formatCurrency(c.total)}</TableCell></TableRow>)}</TableBody></Table>
                </div>
            </CardContent>
        </Card>
    );
}

function IndirectCostsTab() {
    const [costs, setCosts] = useState<IndirectCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fetchCosts = () => { setIsLoading(true); getIndirectCosts().then(data => { setCosts(data as IndirectCost[]); setIsLoading(false); }); };
    useEffect(() => { fetchCosts(); }, []);
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between"><div className="space-y-1.5"><CardTitle>Indirect Costs</CardTitle><CardDescription>Operational costs not tied to a single product.</CardDescription></div><AddIndirectCostDialog onCostAdded={fetchCosts} /></CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{costs.map(c => <TableRow key={c.id}><TableCell>{format(new Date(c.date), 'PPP')}</TableCell><TableCell>{c.description}</TableCell><TableCell>{c.category}</TableCell><TableCell className="text-right">{formatCurrency(c.amount)}</TableCell></TableRow>)}</TableBody></Table>
                </div>
            </CardContent>
        </Card>
    );
}

// --- New Payments & Requests Tab ---
function PaymentsRequestsTab() {
    const { toast } = useToast();
    const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchConfirmations = useCallback(() => {
        setIsLoading(true);
        getPaymentConfirmations().then(data => {
            setConfirmations(data);
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch payment confirmations.' });
        }).finally(() => {
            setIsLoading(false);
        });
    }, [toast]);
    
    useEffect(() => {
        fetchConfirmations();
    }, [fetchConfirmations]);

    const handleAction = async (confirmationId: string, action: 'approve' | 'decline') => {
        setActioningId(confirmationId);
        const result = await handlePaymentConfirmation(confirmationId, action);
        if (result.success) {
            toast({ title: 'Success', description: `Payment has been ${action}d.` });
            fetchConfirmations(); // Refresh the list
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setActioningId(null);
    }
    
    const pendingConfirmations = confirmations.filter(c => c.status === 'pending');
    const resolvedConfirmations = confirmations.filter(c => c.status !== 'pending');
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Pending Payment Confirmations</CardTitle>
                            <CardDescription>Review and approve payments reported by delivery staff for credit sales.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchConfirmations} disabled={isLoading}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Driver</TableHead><TableHead>Run ID</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                        ) : pendingConfirmations.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No pending confirmations.</TableCell></TableRow>
                        ) : (
                            pendingConfirmations.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{format(new Date(c.date), 'Pp')}</TableCell>
                                <TableCell>{c.driverName}</TableCell>
                                <TableCell>{c.runId.substring(0, 8)}...</TableCell>
                                <TableCell>{formatCurrency(c.amount)}</TableCell>
                                <TableCell className="text-right">
                                     <div className="flex gap-2 justify-end">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={!!actioningId}>Decline</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure you want to decline?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleAction(c.id, 'decline')}>Decline</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button size="sm" onClick={() => handleAction(c.id, 'approve')} disabled={actioningId === c.id}>{actioningId === c.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Approve'}</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            ))
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Resolved Requests</CardTitle>
                    <CardDescription>A log of all previously approved and declined payment requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                         <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Driver</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                         <TableBody>
                             {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : resolvedConfirmations.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No resolved requests.</TableCell></TableRow>
                            ) : (
                                resolvedConfirmations.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{format(new Date(c.date), 'Pp')}</TableCell>
                                    <TableCell>{c.driverName}</TableCell>
                                    <TableCell>{formatCurrency(c.amount)}</TableCell>
                                    <TableCell><Badge variant={c.status === 'approved' ? 'default' : 'destructive'}>{c.status}</Badge></TableCell>
                                </TableRow>
                                ))
                            )}
                         </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}


function SalesRecordsTab() {
    const [records, setRecords] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { getSales().then(data => { setRecords(data as Sale[]); setIsLoading(false); }); }, []);
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    return (
        <Card>
            <CardHeader><CardTitle>Daily Sales Records</CardTitle><CardDescription>A log of all daily sales transactions.</CardDescription></CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Cash</TableHead><TableHead className="text-right">Transfer</TableHead><TableHead className="text-right">POS</TableHead><TableHead className="text-right">Credit Sales</TableHead><TableHead className="text-right">Shortage</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>{records.map(r => <TableRow key={r.id}><TableCell>{format(new Date(r.date), 'PPP')}</TableCell><TableCell>{r.description}</TableCell><TableCell className="text-right">{formatCurrency(r.cash)}</TableCell><TableCell className="text-right">{formatCurrency(r.transfer)}</TableCell><TableCell className="text-right">{formatCurrency(r.pos)}</TableCell><TableCell className="text-right">{formatCurrency(r.creditSales)}</TableCell><TableCell className="text-right">{formatCurrency(r.shortage)}</TableCell><TableCell className="text-right font-bold">{formatCurrency(r.total)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function DrinkSalesTab() {
    const [records, setRecords] = useState<DrinkSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { getDrinkSales().then(data => { setRecords(data as DrinkSale[]); setIsLoading(false); }); }, []);
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    return (
        <Card>
            <CardHeader><CardTitle>Drink Sales</CardTitle><CardDescription>Sales records specifically for drinks.</CardDescription></CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Drink Type</TableHead><TableHead className="text-right">Purchase Amount</TableHead><TableHead className="text-right">Qty Sold</TableHead><TableHead className="text-right">Selling Price</TableHead><TableHead className="text-right">Total Amount</TableHead></TableRow></TableHeader>
                        <TableBody>{records.map(r => <TableRow key={r.id}><TableCell>{r.drinkType}</TableCell><TableCell className="text-right">{formatCurrency(r.amountPurchases)}</TableCell><TableCell className="text-right">{r.quantitySold}</TableCell><TableCell className="text-right">{formatCurrency(r.sellingPrice)}</TableCell><TableCell className="text-right">{formatCurrency(r.amount)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


export default function AccountingPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold font-headline">Accounting</h1>
      <Tabs defaultValue="summary" className="space-y-4">
        <div className="overflow-x-auto pb-2">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:w-auto">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="debt">Debtors & Creditors</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="payments">Payments & Requests</TabsTrigger>
                <TabsTrigger value="sales-records">Sales Records</TabsTrigger>
                <TabsTrigger value="drink-sales">Drink Sales</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="summary"><SummaryTab /></TabsContent>

        <TabsContent value="debt"><DebtTab /></TabsContent>
        
        <TabsContent value="expenses">
            <Tabs defaultValue="direct" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="direct">Direct Costs</TabsTrigger>
                    <TabsTrigger value="indirect">Indirect Costs</TabsTrigger>
                </TabsList>
                <TabsContent value="direct"><DirectCostsTab /></TabsContent>
                <TabsContent value="indirect"><IndirectCostsTab /></TabsContent>
            </Tabs>
        </TabsContent>

        <TabsContent value="payments">
            <PaymentsRequestsTab />
        </TabsContent>

        <TabsContent value="sales-records"><SalesRecordsTab /></TabsContent>

        <TabsContent value="drink-sales"><DrinkSalesTab /></TabsContent>

      </Tabs>
    </div>
  );
}
