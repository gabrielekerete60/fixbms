
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2, DollarSign, Receipt, Users, TrendingDown, TrendingUp, HandCoins, MinusCircle, PlusCircle, PenSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFinancialSummary, getDebtRecords, getDirectCosts, getIndirectCosts, getClosingStocks, getWages, addDirectCost, addIndirectCost } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Helper Functions & Type Definitions ---
const formatCurrency = (amount: number) => `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FinancialSummary = {
    totalRevenue: number;
    totalExpenditure: number;
    grossProfit: number;
    netProfit: number;
};

type DebtRecord = { id: string; date: { toDate: () => Date }; description: string; debit: number; credit: number; };
type DirectCost = { id: string; date: { toDate: () => Date }; description: string; category: string; quantity: number; total: number; };
type IndirectCost = { id: string; date: { toDate: () => Date }; description: string; category: string; amount: number; };
type ClosingStock = { id: string; item: string; remainingStock: string; amount: number; };
type Wage = { id: string; name: string; department: string; position: string; salary: number; deductions: { shortages: number; advanceSalary: number }; netPay: number; };

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

function ReportsSummaryTab() {
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenditure)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.grossProfit)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(summary.netProfit)}</div>
                </CardContent>
            </Card>
        </div>
    );
}

function DebtorsCreditorsTab() {
    const [records, setRecords] = useState<DebtRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getDebtRecords().then(data => {
            setRecords(data as DebtRecord[]);
            setIsLoading(false);
        });
    }, []);

    const totals = useMemo(() => records.reduce((acc, rec) => {
        acc.debit += rec.debit;
        acc.credit += rec.credit;
        return acc;
    }, { debit: 0, credit: 0 }), [records]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Debtors & Creditors</CardTitle>
                <CardDescription>Manage all money owed to and by the bakery.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit (Owed to Us)</TableHead>
                            <TableHead className="text-right">Credit (We Owe)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.map(rec => (
                            <TableRow key={rec.id}>
                                <TableCell>{format(rec.date.toDate(), 'PPP')}</TableCell>
                                <TableCell>{rec.description}</TableCell>
                                <TableCell className="text-right">{formatCurrency(rec.debit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(rec.credit)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold">Totals</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totals.debit)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totals.credit)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
}

function ExpensesTab() {
    const [directCosts, setDirectCosts] = useState<DirectCost[]>([]);
    const [indirectCosts, setIndirectCosts] = useState<IndirectCost[]>([]);
    const [closingStocks, setClosingStocks] = useState<ClosingStock[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCosts = () => {
        setIsLoading(true);
        Promise.all([
            getDirectCosts(),
            getIndirectCosts(),
            getClosingStocks()
        ]).then(([direct, indirect, stocks]) => {
            setDirectCosts(direct as DirectCost[]);
            setIndirectCosts(indirect as IndirectCost[]);
            setClosingStocks(stocks as ClosingStock[]);
            setIsLoading(false);
        });
    }

    useEffect(() => {
        fetchCosts();
    }, []);
    
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Tabs defaultValue="direct">
            <TabsList>
                <TabsTrigger value="direct">Direct Costs</TabsTrigger>
                <TabsTrigger value="indirect">Indirect Costs</TabsTrigger>
                <TabsTrigger value="stock">Closing Stock</TabsTrigger>
            </TabsList>
            <TabsContent value="direct" className="mt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1.5"><CardTitle>Direct Costs</CardTitle><CardDescription>Costs directly tied to production, like ingredients.</CardDescription></div>
                        <AddDirectCostDialog onCostAdded={fetchCosts} />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>{directCosts.map(c => <TableRow key={c.id}><TableCell>{format(c.date.toDate(), 'PPP')}</TableCell><TableCell>{c.description}</TableCell><TableCell>{c.category}</TableCell><TableCell className="text-right">{c.quantity}</TableCell><TableCell className="text-right">{formatCurrency(c.total)}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="indirect" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1.5"><CardTitle>Indirect Costs</CardTitle><CardDescription>Operational costs not tied to a single product.</CardDescription></div>
                         <AddIndirectCostDialog onCostAdded={fetchCosts} />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>{indirectCosts.map(c => <TableRow key={c.id}><TableCell>{format(c.date.toDate(), 'PPP')}</TableCell><TableCell>{c.description}</TableCell><TableCell>{c.category}</TableCell><TableCell className="text-right">{formatCurrency(c.amount)}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="stock" className="mt-4">
                <Card>
                    <CardHeader><CardTitle>Closing Stock</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Remaining</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                             <TableBody>{closingStocks.map(s => <TableRow key={s.id}><TableCell>{s.item}</TableCell><TableCell>{s.remainingStock}</TableCell><TableCell className="text-right">{formatCurrency(s.amount)}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

function PaymentsTab() {
    const [wages, setWages] = useState<Wage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getWages().then(data => {
            setWages(data as Wage[]);
            setIsLoading(false);
        });
    }, []);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payroll & Payments</CardTitle>
                <CardDescription>Manage employee payroll and other payment requests.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead className="text-right">Salary</TableHead>
                            <TableHead className="text-right">Deductions</TableHead>
                            <TableHead className="text-right">Net Pay</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {wages.map(w => (
                            <TableRow key={w.id}>
                                <TableCell>{w.name}</TableCell>
                                <TableCell>{w.position} ({w.department})</TableCell>
                                <TableCell className="text-right">{formatCurrency(w.salary)}</TableCell>
                                <TableCell className="text-right text-destructive">{formatCurrency(w.deductions.shortages + w.deductions.advanceSalary)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(w.netPay)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function AccountingPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold font-headline">Accounting Dashboard</h1>
      <Tabs defaultValue="summary">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Reports & Summary</TabsTrigger>
          <TabsTrigger value="debtors">Debtors/Creditors</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payments">Payments & Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4"><ReportsSummaryTab /></TabsContent>
        <TabsContent value="debtors" className="mt-4"><DebtorsCreditorsTab /></TabsContent>
        <TabsContent value="expenses" className="mt-4"><ExpensesTab /></TabsContent>
        <TabsContent value="payments" className="mt-4"><PaymentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

    