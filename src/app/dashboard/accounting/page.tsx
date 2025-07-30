
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2, DollarSign, Receipt, TrendingDown, TrendingUp, PenSquare, RefreshCcw, HandCoins, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFinancialSummary, getDebtRecords, getDirectCosts, getIndirectCosts, getClosingStocks, getWages, addDirectCost, addIndirectCost, getSales, getDrinkSalesSummary, PaymentConfirmation, getPaymentConfirmations, handlePaymentConfirmation, getCreditors, getDebtors, Creditor, Debtor, handleLogPayment } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// --- Helper Functions & Type Definitions ---
const formatCurrency = (amount?: number) => `₦${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FinancialSummary = { totalRevenue: number; totalExpenditure: number; grossProfit: number; netProfit: number; };
type DebtRecord = { id: string; date: string; description: string; debit: number; credit: number; };
type DirectCost = { id: string; date: string; description: string; category: string; quantity: number; total: number; };
type IndirectCost = { id: string; date: string; description: string; category: string; amount: number; };
type ClosingStock = { id: string; item: string; remainingStock: string; amount: number; };
type Wage = { id: string; name: string; department: string; position: string; salary: number; deductions: { shortages: number; advanceSalary: number; debt: number; fine: number; }; netPay: number; };
type Sale = { id: string; date: string; description: string; cash: number; transfer: number; pos: number; creditSales: number; shortage: number; total: number; };
type DrinkSaleSummary = { productId: string; productName: string; quantitySold: number; totalRevenue: number; };

const chartConfig = {
  amount: {
    label: "Amount (₦)",
    color: "hsl(var(--primary))",
  },
   total: {
    label: "Total (₦)",
    color: "hsl(var(--primary))",
  },
};
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

function LogPaymentDialog({ creditor, onPaymentLogged }: { creditor: Creditor, onPaymentLogged: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [amount, setAmount] = useState<number | string>('');

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid amount.'});
            return;
        }
        if (Number(amount) > creditor.balance) {
             toast({ variant: 'destructive', title: 'Error', description: `Payment cannot be greater than the outstanding balance of ${formatCurrency(creditor.balance)}.`});
            return;
        }
        setIsLoading(true);
        const result = await handleLogPayment(creditor.id, Number(amount));
        if (result.success) {
            toast({ title: 'Success', description: `Payment of ${formatCurrency(Number(amount))} logged.`});
            onPaymentLogged();
            setIsOpen(false);
            setAmount('');
        } else {
             toast({ variant: 'destructive', title: 'Error', description: result.error});
        }
        setIsLoading(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><HandCoins className="h-4 w-4"/></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Payment to {creditor.name}</DialogTitle>
                    <DialogDescription>
                        Outstanding Balance: <span className="font-bold text-destructive">{formatCurrency(creditor.balance)}</span>
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4">
                    <Label htmlFor="payment-amount">Amount Paid (₦)</Label>
                    <Input id="payment-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Log Payment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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

function DebtorsCreditorsTab() {
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [debtLedger, setDebtLedger] = useState<DebtRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        Promise.all([getCreditors(), getDebtors(), getDebtRecords()]).then(([credData, debtData, ledgerData]) => {
            setCreditors(credData);
            setDebtors(debtData);
            setDebtLedger(ledgerData as DebtRecord[]);
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const { debitTotal, creditTotal } = useMemo(() => {
        const debit = debtLedger.reduce((sum, item) => sum + (item.debit || 0), 0);
        const credit = debtLedger.reduce((sum, item) => sum + (item.credit || 0), 0);
        return { debitTotal: debit, creditTotal: credit };
    }, [debtLedger]);
    
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Creditors (Money We Owe)</CardTitle>
                        <CardDescription>Suppliers to whom the business has an outstanding balance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Contact</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-center">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {creditors.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No outstanding creditors.</TableCell></TableRow>}
                                {creditors.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.name}</TableCell>
                                        <TableCell>{c.contactPerson}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(c.balance)}</TableCell>
                                        <TableCell className="text-center"><LogPaymentDialog creditor={c} onPaymentLogged={fetchData} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Debtors (Money Owed to Us)</CardTitle>
                        <CardDescription>Customers who have an outstanding credit balance with the business.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {debtors.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">No outstanding debtors.</TableCell></TableRow>}
                                {debtors.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell>{d.name}</TableCell>
                                        <TableCell>{d.phone}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(d.balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Debtor/Creditor Ledger</CardTitle>
                    <CardDescription>A summary ledger of debits and credits from the accounting period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtLedger.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No ledger entries.</TableCell></TableRow>}
                                {debtLedger.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{format(new Date(item.date), 'PPP')}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.debit ? formatCurrency(item.debit) : '-'}</TableCell>
                                        <TableCell className="text-right">{item.credit ? formatCurrency(item.credit) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={2} className="text-right font-bold">Ground Total</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(debitTotal)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(creditTotal)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Outstanding Balance</TableCell>
                                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(debitTotal - creditTotal)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function DirectCostsTab() {
    const [costs, setCosts] = useState<DirectCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCosts = useCallback(() => {
        setIsLoading(true);
        getDirectCosts().then(data => {
            setCosts(data as DirectCost[]);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchCosts();
    }, [fetchCosts]);

    const { totalCost, categoryTotals, chartData } = useMemo(() => {
        const filteredCosts = costs.filter(cost => cost.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const total = filteredCosts.reduce((sum, cost) => sum + cost.total, 0);

        const totals: { [key: string]: number } = filteredCosts.reduce((acc, cost) => {
            acc[cost.category] = (acc[cost.category] || 0) + cost.total;
            return acc;
        }, {});

        const sortedCategories = Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const chart = sortedCategories.map(([name, total]) => ({ name, total }));

        return { totalCost: total, categoryTotals: sortedCategories, chartData: chart };
    }, [costs, searchTerm]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Direct Cost</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
                        <p className="text-xs text-muted-foreground">For all fetched records</p>
                    </CardContent>
                </Card>
                {categoryTotals.map(([name, total]) => (
                    <Card key={name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <CardTitle>Direct Costs Log</CardTitle>
                            <CardDescription>All costs directly tied to production, like ingredients.</CardDescription>
                        </div>
                        <div className="flex w-full md:w-auto items-center gap-2">
                             <div className="relative flex-1 md:flex-initial">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search descriptions..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <AddDirectCostDialog onCostAdded={fetchCosts} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costs.filter(c => c.description.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{format(new Date(c.date), 'PPP')}</TableCell>
                                            <TableCell>{c.description}</TableCell>
                                            <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                                            <TableCell className="text-right">{c.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(c.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Top 5 Expense Categories</CardTitle>
                        <CardDescription>A visual breakdown of your top direct costs.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid horizontal={false} />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                                <XAxis dataKey="total" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function IndirectCostsTab() {
    const [costs, setCosts] = useState<IndirectCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCosts = useCallback(() => {
        setIsLoading(true);
        getIndirectCosts().then(data => {
            setCosts(data as IndirectCost[]);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchCosts();
    }, [fetchCosts]);

    const { totalCost, categoryTotals, chartData } = useMemo(() => {
        const filteredCosts = costs.filter(cost => cost.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const total = filteredCosts.reduce((sum, cost) => sum + cost.amount, 0);

        const totals: { [key: string]: number } = filteredCosts.reduce((acc, cost) => {
            acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
            return acc;
        }, {});

        const sortedCategories = Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const chart = sortedCategories.map(([name, amount]) => ({ name, amount }));

        return { totalCost: total, categoryTotals: sortedCategories, chartData: chart };
    }, [costs, searchTerm]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Indirect Cost</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
                        <p className="text-xs text-muted-foreground">For all fetched records</p>
                    </CardContent>
                </Card>
                {categoryTotals.map(([name, amount]) => (
                    <Card key={name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <CardTitle>Indirect Costs Log</CardTitle>
                            <CardDescription>All operational costs not tied to a single product.</CardDescription>
                        </div>
                        <div className="flex w-full md:w-auto items-center gap-2">
                             <div className="relative flex-1 md:flex-initial">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search descriptions..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <AddIndirectCostDialog onCostAdded={fetchCosts} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costs.filter(c => c.description.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{format(new Date(c.date), 'PPP')}</TableCell>
                                            <TableCell>{c.description}</TableCell>
                                            <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                                            <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Top 5 Expense Categories</CardTitle>
                        <CardDescription>A visual breakdown of your top indirect costs.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid horizontal={false} />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                                <XAxis dataKey="amount" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle>Pending Payment Confirmations</CardTitle>
                            <CardDescription>Review and approve cash payments reported by drivers.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchConfirmations} disabled={isLoading}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                   <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Driver</TableHead><TableHead>Run ID</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                        ) : pendingConfirmations.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">No pending confirmations.</TableCell></TableRow>
                        ) : (
                            pendingConfirmations.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{format(new Date(c.date), 'Pp')}</TableCell>
                                <TableCell>{c.driverName}</TableCell>
                                <TableCell>{c.runId.substring(0, 8)}...</TableCell>
                                <TableCell>{c.customerName}</TableCell>
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
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Resolved Requests</CardTitle>
                    <CardDescription>A log of all previously approved and declined payment requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
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
                    </div>
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
    const [records, setRecords] = useState<DrinkSaleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { getDrinkSalesSummary().then(data => { setRecords(data); setIsLoading(false); }); }, []);
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    return (
        <Card>
            <CardHeader><CardTitle>Drink Sales Summary</CardTitle><CardDescription>Summary of sales for products in the 'Drinks' category.</CardDescription></CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Drink</TableHead><TableHead className="text-right">Quantity Sold</TableHead><TableHead className="text-right">Total Revenue</TableHead></TableRow></TableHeader>
                        <TableBody>{records.map(r => <TableRow key={r.productId}><TableCell>{r.productName}</TableCell><TableCell className="text-right">{r.quantitySold}</TableCell><TableCell className="text-right">{formatCurrency(r.totalRevenue)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function ClosingStockTab() {
    const [records, setRecords] = useState<ClosingStock[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getClosingStocks().then(data => {
            setRecords(data as ClosingStock[]);
            setIsLoading(false);
        });
    }, []);

    const totalAmount = useMemo(() => {
        return records.reduce((sum, item) => sum + (item.amount || 0), 0);
    }, [records]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Closing Stock</CardTitle>
                <CardDescription>The value of inventory at the end of the accounting period.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Remaining Stock</TableHead>
                                <TableHead className="text-right">Amount (₦)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.item}</TableCell>
                                    <TableCell>{r.remainingStock}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="font-bold text-right">Total Closing Stock</TableCell>
                                <TableCell className="font-bold text-right">{formatCurrency(totalAmount)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function WagesTab() {
    const [records, setRecords] = useState<Wage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getWages().then(data => {
            setRecords(data as Wage[]);
            setIsLoading(false);
        });
    }, []);

    const totals = useMemo(() => {
        return records.reduce((acc, curr) => {
            acc.salary += curr.salary || 0;
            acc.shortages += curr.deductions?.shortages || 0;
            acc.advanceSalary += curr.deductions?.advanceSalary || 0;
            acc.debt += curr.deductions?.debt || 0;
            acc.fine += curr.deductions?.fine || 0;
            acc.netPay += curr.netPay || 0;
            return acc;
        }, { salary: 0, shortages: 0, advanceSalary: 0, debt: 0, fine: 0, netPay: 0 });
    }, [records]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const totalDeductions = (r: Wage) => (r.deductions?.shortages || 0) + (r.deductions?.advanceSalary || 0) + (r.deductions?.debt || 0) + (r.deductions?.fine || 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Wages &amp; Salaries</CardTitle>
                <CardDescription>Monthly staff emolument records.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead className="text-right">Salary</TableHead>
                                <TableHead className="text-right">Total Deductions</TableHead>
                                <TableHead className="text-right">Net Pay</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.name}</TableCell>
                                    <TableCell>{r.position}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.salary)}</TableCell>
                                    <TableCell className="text-right text-destructive">{formatCurrency(totalDeductions(r))}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(r.netPay)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="text-right font-bold">Total</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totals.salary)}</TableCell>
                                <TableCell className="text-right font-bold text-destructive">{formatCurrency(totals.shortages + totals.advanceSalary + totals.debt + totals.fine)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totals.netPay)}</TableCell>
                            </TableRow>
                        </TableFooter>
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
            <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="debt">Debt</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="payments">Payments &amp; Requests</TabsTrigger>
                <TabsTrigger value="sales-records">Sales Records</TabsTrigger>
                <TabsTrigger value="drink-sales">Drink Sales</TabsTrigger>
                <TabsTrigger value="wages">Wages</TabsTrigger>
                <TabsTrigger value="closing-stock">Closing Stock</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="summary"><SummaryTab /></TabsContent>
        <TabsContent value="debt"><DebtorsCreditorsTab /></TabsContent>
        <TabsContent value="expenses">
            <Tabs defaultValue="indirect" className="space-y-4">
                 <div className="overflow-x-auto pb-2">
                    <TabsList>
                        <TabsTrigger value="indirect">Indirect Costs</TabsTrigger>
                        <TabsTrigger value="direct">Direct Costs</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="indirect"><IndirectCostsTab /></TabsContent>
                <TabsContent value="direct"><DirectCostsTab /></TabsContent>
            </Tabs>
        </TabsContent>
        <TabsContent value="payments"><PaymentsRequestsTab /></TabsContent>
        <TabsContent value="sales-records"><SalesRecordsTab /></TabsContent>
        <TabsContent value="drink-sales"><DrinkSalesTab /></TabsContent>
        <TabsContent value="wages"><WagesTab /></TabsContent>
        <TabsContent value="closing-stock"><ClosingStockTab /></TabsContent>

      </Tabs>
    </div>
  );
}

    