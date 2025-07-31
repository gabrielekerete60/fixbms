

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2, DollarSign, Receipt, TrendingDown, TrendingUp, PenSquare, RefreshCcw, HandCoins, Search, Calendar as CalendarIcon, ArrowRight, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { getFinancialSummary, getDebtRecords, getDirectCosts, getIndirectCosts, getClosingStocks, getWages, addDirectCost, addIndirectCost, getSales, getDrinkSalesSummary, PaymentConfirmation, getPaymentConfirmations, handlePaymentConfirmation, getCreditors, getDebtors, Creditor, Debtor, handleLogPayment, getWasteLogs, WasteLog, getDiscountRecords, getProfitAndLossStatement, ProfitAndLossStatement, getAccountSummary } from '@/app/actions';
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';


// --- Helper Functions & Type Definitions ---
const formatCurrency = (amount?: number) => `₦${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type AccountSummary = Record<string, number>;
type DebtRecord = { id: string; date: string; description: string; debit: number; credit: number; };
type DirectCost = { id: string; date: string; description: string; category: string; quantity: number; total: number; };
type IndirectCost = { id: string; date: string; description: string; category: string; amount: number; };
type ClosingStock = { id: string; item: string; remainingStock: string; amount: number; };
type DiscountRecord = { id: string; bread_type: string; amount: number };
type Wage = { id: string; name: string; department: string; position: string; salary: number; deductions: { shortages: number; advanceSalary: number; debt: number; fine: number; }; netPay: number; };
type Sale = { id: string; date: string; description: string; cash: number; transfer: number; pos: number; creditSales: number; shortage: number; total: number; };
type DrinkSaleSummary = { productId: string; productName: string; quantitySold: number; totalRevenue: number; costPrice: number, stock: number };

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

function PaginationControls({
    visibleRows,
    setVisibleRows,
    totalRows
}: {
    visibleRows: number | 'all',
    setVisibleRows: (val: number | 'all') => void,
    totalRows: number
}) {
    const [inputValue, setInputValue] = useState<string | number>('');

    const handleApplyInput = () => {
        const num = Number(inputValue);
        if (!isNaN(num) && num > 0) {
            setVisibleRows(num);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <span>Show:</span>
            <Button variant={visibleRows === 10 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(10)}>10</Button>
            <Button variant={visibleRows === 20 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(20)}>20</Button>
            <Button variant={visibleRows === 50 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(50)}>50</Button>
            <Button variant={visibleRows === 'all' ? "default" : "outline"} size="sm" onClick={() => setVisibleRows('all')}>All ({totalRows})</Button>
            <div className="flex items-center gap-2">
                <Input 
                    type="number" 
                    className="h-9 w-20"
                    placeholder="Custom"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyInput()}
                />
                 <Button size="sm" onClick={handleApplyInput}>Apply</Button>
            </div>
        </div>
    )
}

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
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>();

    const fetchSummary = useCallback(async (newDate: DateRange | undefined) => {
        setIsLoading(true);
        const range = newDate?.from ? { from: startOfDay(newDate.from), to: endOfDay(newDate.to || newDate.from) } : undefined;
        const data = await getAccountSummary(range);
        setSummary(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchSummary(date);
    }, [date, fetchSummary]);

    const totalSummary = useMemo(() => {
        if (!summary) return 0;
        return Object.values(summary).reduce((acc, value) => acc + (value || 0), 0);
    }, [summary]);

    if (isLoading || !summary) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const summaryOrder: (keyof AccountSummary)[] = [
        'Sale', 'Purchases (Confectioneries)', 'Closing Stock', 'Expenses', 'Discount Allowed', 
        'Bad or Damages', 'Loan', 'Indirect Exp', 'Assets', 'Debtor', 'Equipment'
    ];

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Summary of Account</CardTitle>
                        <CardDescription>A top-level overview of key financial accounts.</CardDescription>
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full sm:w-auto min-w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Filter by date range</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold">Account</TableHead>
                            <TableHead className="text-right font-bold">Amount (₦)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summaryOrder.map(key => (
                            <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(summary[key])}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="text-right font-bold">Grand Total</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalSummary)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
}

function DebtorsCreditorsTab() {
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [debtLedger, setDebtLedger] = useState<DebtRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>();
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

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
    
    const filteredLedger = useMemo(() => {
        if (!date?.from) return debtLedger;
        const from = startOfDay(date.from);
        const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
        return debtLedger.filter(rec => {
            const recDate = new Date(rec.date);
            return recDate >= from && recDate <= to;
        });
    }, [debtLedger, date]);
    
    const { debitTotal, creditTotal } = useMemo(() => {
        const debit = filteredLedger.reduce((sum, item) => sum + (item.debit || 0), 0);
        const credit = filteredLedger.reduce((sum, item) => sum + (item.credit || 0), 0);
        return { debitTotal: debit, creditTotal: credit };
    }, [filteredLedger]);

    const paginatedLedger = useMemo(() => {
        return visibleRows === 'all' ? filteredLedger : filteredLedger.slice(0, visibleRows);
    }, [filteredLedger, visibleRows]);
    
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
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Debtor/Creditor Ledger</CardTitle>
                            <CardDescription>A summary ledger of debits and credits from the accounting period.</CardDescription>
                        </div>
                         <Popover>
                            <PopoverTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                            </PopoverContent>
                        </Popover>
                    </div>
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
                                {paginatedLedger.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No ledger entries for this period.</TableCell></TableRow>}
                                {paginatedLedger.map(item => (
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
                <CardFooter>
                    <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={filteredLedger.length} />
                </CardFooter>
            </Card>
        </div>
    );
}

function DirectCostsTab() {
    const [costs, setCosts] = useState<DirectCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [date, setDate] = useState<DateRange | undefined>();
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

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

    const { totalCost, categoryTotals, chartData, filteredCosts } = useMemo(() => {
        let dateFilteredCosts = costs;
        if (date?.from) {
            const from = startOfDay(date.from);
            const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
            dateFilteredCosts = costs.filter(cost => {
                const costDate = new Date(cost.date);
                return costDate >= from && costDate <= to;
            });
        }
        
        const filtered = dateFilteredCosts.filter(cost => cost.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const total = filtered.reduce((sum, cost) => sum + cost.total, 0);

        const totals: { [key: string]: number } = filtered.reduce((acc, cost) => {
            acc[cost.category] = (acc[cost.category] || 0) + cost.total;
            return acc;
        }, {});

        const sortedCategories = Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const chart = sortedCategories.map(([name, total]) => ({ name, total }));

        return { totalCost: total, categoryTotals: sortedCategories, chartData: chart, filteredCosts: filtered };
    }, [costs, searchTerm, date]);
    
    const paginatedCosts = useMemo(() => {
        return visibleRows === 'all' ? filteredCosts : filteredCosts.slice(0, visibleRows);
    }, [filteredCosts, visibleRows]);

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
                        <p className="text-xs text-muted-foreground">For selected period</p>
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
                            <Popover>
                                <PopoverTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/></PopoverContent>
                            </Popover>
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
                                    {paginatedCosts.map(c => (
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
                    <CardFooter>
                        <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={filteredCosts.length} />
                    </CardFooter>
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
    const [date, setDate] = useState<DateRange | undefined>();
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

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

    const { totalCost, categoryTotals, chartData, filteredCosts } = useMemo(() => {
        let dateFilteredCosts = costs;
        if (date?.from) {
            const from = startOfDay(date.from);
            const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
            dateFilteredCosts = costs.filter(cost => {
                const costDate = new Date(cost.date);
                return costDate >= from && costDate <= to;
            });
        }
        
        const filtered = dateFilteredCosts.filter(cost => cost.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const total = filtered.reduce((sum, cost) => sum + cost.amount, 0);

        const totals: { [key: string]: number } = filtered.reduce((acc, cost) => {
            acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
            return acc;
        }, {});

        const sortedCategories = Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const chart = sortedCategories.map(([name, amount]) => ({ name, amount }));

        return { totalCost: total, categoryTotals: sortedCategories, chartData: chart, filteredCosts: filtered };
    }, [costs, searchTerm, date]);
    
    const paginatedCosts = useMemo(() => {
        return visibleRows === 'all' ? filteredCosts : filteredCosts.slice(0, visibleRows);
    }, [filteredCosts, visibleRows]);

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
                        <p className="text-xs text-muted-foreground">For selected period</p>
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
                             <Popover>
                                <PopoverTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/></PopoverContent>
                            </Popover>
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
                                    {paginatedCosts.map(c => (
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
                    <CardFooter>
                        <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={filteredCosts.length} />
                    </CardFooter>
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
    const [visiblePendingRows, setVisiblePendingRows] = useState<number | 'all'>(10);
    const [visibleResolvedRows, setVisibleResolvedRows] = useState<number | 'all'>(10);

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

    const paginatedPending = useMemo(() => {
        return visiblePendingRows === 'all' ? pendingConfirmations : pendingConfirmations.slice(0, visiblePendingRows);
    }, [pendingConfirmations, visiblePendingRows]);

    const paginatedResolved = useMemo(() => {
        return visibleResolvedRows === 'all' ? resolvedConfirmations : resolvedConfirmations.slice(0, visibleResolvedRows);
    }, [resolvedConfirmations, visibleResolvedRows]);
    
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
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Driver</TableHead><TableHead>Run ID</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                        ) : paginatedPending.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center">No pending confirmations.</TableCell></TableRow>
                        ) : (
                            paginatedPending.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{format(new Date(c.date), 'Pp')}</TableCell>
                                <TableCell>{c.driverName}</TableCell>
                                <TableCell>{c.runId.substring(0, 8)}...</TableCell>
                                <TableCell>{c.customerName}</TableCell>
                                <TableCell>{formatCurrency(c.amount)}</TableCell>
                                <TableCell><Badge variant="outline">{c.paymentMethod}</Badge></TableCell>
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
                 <CardFooter>
                    <PaginationControls visibleRows={visiblePendingRows} setVisibleRows={setVisiblePendingRows} totalRows={pendingConfirmations.length} />
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Resolved Requests</CardTitle>
                    <CardDescription>A log of all previously approved and declined payment requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                         <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Driver</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                         <TableBody>
                             {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : paginatedResolved.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No resolved requests.</TableCell></TableRow>
                            ) : (
                                paginatedResolved.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{format(new Date(c.date), 'Pp')}</TableCell>
                                    <TableCell>{c.driverName}</TableCell>
                                    <TableCell>{formatCurrency(c.amount)}</TableCell>
                                    <TableCell><Badge variant="outline">{c.paymentMethod}</Badge></TableCell>
                                    <TableCell><Badge variant={c.status === 'approved' ? 'default' : 'destructive'}>{c.status}</Badge></TableCell>
                                </TableRow>
                                ))
                            )}
                         </TableBody>
                    </Table>
                    </div>
                </CardContent>
                 <CardFooter>
                    <PaginationControls visibleRows={visibleResolvedRows} setVisibleRows={setVisibleResolvedRows} totalRows={resolvedConfirmations.length} />
                </CardFooter>
            </Card>
        </div>
    )
}


function SalesRecordsTab() {
    const [records, setRecords] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>();
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

    useEffect(() => { 
        getSales().then(data => { 
            setRecords(data as Sale[]); 
            setIsLoading(false); 
        }); 
    }, []);

    const filteredRecords = useMemo(() => {
        if (!date?.from) return records;
        const from = startOfDay(date.from);
        const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
        return records.filter(rec => {
            const recDate = new Date(rec.date);
            return recDate >= from && recDate <= to;
        });
    }, [records, date]);
    
    const paginatedRecords = useMemo(() => {
        return visibleRows === 'all' ? filteredRecords : filteredRecords.slice(0, visibleRows);
    }, [filteredRecords, visibleRows]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Daily Sales Records</CardTitle>
                        <CardDescription>A log of all daily sales transactions.</CardDescription>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full md:w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Cash</TableHead><TableHead className="text-right">Transfer</TableHead><TableHead className="text-right">POS</TableHead><TableHead className="text-right">Credit Sales</TableHead><TableHead className="text-right">Shortage</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>{paginatedRecords.map(r => <TableRow key={r.id}><TableCell>{format(new Date(r.date), 'PPP')}</TableCell><TableCell>{r.description}</TableCell><TableCell className="text-right">{formatCurrency(r.cash)}</TableCell><TableCell className="text-right">{formatCurrency(r.transfer)}</TableCell><TableCell className="text-right">{formatCurrency(r.pos)}</TableCell><TableCell className="text-right">{formatCurrency(r.creditSales)}</TableCell><TableCell className="text-right">{formatCurrency(r.shortage)}</TableCell><TableCell className="text-right font-bold">{formatCurrency(r.total)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter>
                 <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={filteredRecords.length} />
            </CardFooter>
        </Card>
    );
}

function DrinkSalesTab() {
    const [records, setRecords] = useState<DrinkSaleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [salesMargin, setSalesMargin] = useState(5);
    const [date, setDate] = useState<DateRange | undefined>();
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

    const fetchDrinkSales = useCallback(async (newDate: DateRange | undefined) => {
        setIsLoading(true);
        const range = newDate?.from ? { from: startOfDay(newDate.from), to: endOfDay(newDate.to || newDate.from) } : undefined;
        const data = await getDrinkSalesSummary(range);
        setRecords(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchDrinkSales(date);
    }, [date, fetchDrinkSales]);

    const reportData = useMemo(() => {
        return records.map(r => {
            const amountPurchases = r.costPrice * r.quantitySold;
            const amount = r.totalRevenue;
            const salesMarginTotal = amount * (1 + salesMargin / 100);
            const quantityRemaining = r.stock;

            return {
                ...r,
                amountPurchases,
                amount,
                salesMarginTotal,
                quantityRemaining: quantityRemaining > 0 ? quantityRemaining : 'NILL'
            };
        });
    }, [records, salesMargin]);

    const { totals, totalQuantitySold } = useMemo(() => {
        const initialTotals = { purchases: 0, amount: 0, marginTotal: 0 };
        const totals = reportData.reduce((acc, curr) => {
            acc.purchases += curr.amountPurchases;
            acc.amount += curr.amount;
            acc.marginTotal += curr.salesMarginTotal;
            return acc;
        }, initialTotals);
        
        const totalQuantitySold = reportData.reduce((sum, item) => sum + item.quantitySold, 0);

        return { totals, totalQuantitySold };
    }, [reportData]);
    
    const paginatedReport = useMemo(() => {
        return visibleRows === 'all' ? reportData : reportData.slice(0, visibleRows);
    }, [reportData, visibleRows]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Drink Sales Record</CardTitle>
                        <CardDescription>A detailed record of drink sales for the selected period.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="sales-margin">Sales Margin %</Label>
                        <Input 
                            id="sales-margin"
                            type="number"
                            value={salesMargin}
                            onChange={e => setSalesMargin(Number(e.target.value))}
                            className="w-20"
                        />
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type of Drink</TableHead>
                                <TableHead className="text-right">Amount Purchases</TableHead>
                                <TableHead className="text-right">Quantity Sold</TableHead>
                                <TableHead className="text-right">Quantity Remaining</TableHead>
                                <TableHead className="text-right">Selling Price</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Sales Margin Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedReport.map(r => (
                                <TableRow key={r.productId}>
                                    <TableCell>{r.productName}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.amountPurchases)}</TableCell>
                                    <TableCell className="text-right">{r.quantitySold}</TableCell>
                                    <TableCell className="text-right">{r.quantityRemaining}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.totalRevenue / r.quantitySold)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(r.salesMarginTotal)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="font-bold">Grand Total</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totals.purchases)}</TableCell>
                                <TableCell className="text-right font-bold">{totalQuantitySold}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totals.amount)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totals.marginTotal)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
            <CardFooter>
                <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={reportData.length} />
            </CardFooter>
        </Card>
    );
}

function ClosingStockTab() {
    const [closingStock, setClosingStock] = useState<ClosingStock[]>([]);
    const [badBread, setBadBread] = useState<WasteLog[]>([]);
    const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
    const [loanAccount, setLoanAccount] = useState<DebtRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>();
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [csData, wasteData, discountData, debtData] = await Promise.all([
                getClosingStocks(),
                getWasteLogs(),
                getDiscountRecords(),
                getDebtRecords()
            ]);
            setClosingStock(csData as ClosingStock[]);
            setBadBread(wasteData.filter(log => log.reason === 'Damaged'));
            setDiscounts(discountData as DiscountRecord[]);
            setLoanAccount(debtData.filter(d => d.description.toLowerCase().includes('loan')) as DebtRecord[]);
        } catch (error) {
            console.error("Error fetching closing stock data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredBadBread = useMemo(() => {
        if (!date?.from) return badBread;
        const from = startOfDay(date.from);
        const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
        return badBread.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= from && logDate <= to;
        });
    }, [badBread, date]);
    
    const filteredLoanAccount = useMemo(() => {
        if (!date?.from) return loanAccount;
        const from = startOfDay(date.from);
        const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
        return loanAccount.filter(rec => {
            const recDate = new Date(rec.date);
            return recDate >= from && recDate <= to;
        });
    }, [loanAccount, date]);

    const paginatedBadBread = useMemo(() => {
        return visibleRows === 'all' ? filteredBadBread : filteredBadBread.slice(0, visibleRows);
    }, [filteredBadBread, visibleRows]);

    const paginatedLoanAccount = useMemo(() => {
        return visibleRows === 'all' ? filteredLoanAccount : filteredLoanAccount.slice(0, visibleRows);
    }, [filteredLoanAccount, visibleRows]);


    const totalClosingStock = useMemo(() => closingStock.reduce((sum, item) => sum + (item.amount || 0), 0), [closingStock]);
    const totalDiscounts = useMemo(() => discounts.reduce((sum, item) => sum + (item.amount || 0), 0), [discounts]);
    const totalLoanDebit = useMemo(() => paginatedLoanAccount.reduce((sum, item) => sum + (item.debit || 0), 0), [paginatedLoanAccount]);
    
    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                 <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={Math.max(filteredBadBread.length, filteredLoanAccount.length)} />
                <Popover>
                    <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Closing Stock</CardTitle>
                        <CardDescription>Value of inventory at the end of the accounting period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Remaining Stock</TableHead><TableHead className="text-right">Amount (₦)</TableHead></TableRow></TableHeader>
                            <TableBody>{closingStock.map(r => <TableRow key={r.id}><TableCell>{r.item}</TableCell><TableCell>{r.remainingStock}</TableCell><TableCell className="text-right">{formatCurrency(r.amount)}</TableCell></TableRow>)}</TableBody>
                            <TableFooter><TableRow><TableCell colSpan={2} className="font-bold text-right">Total Closing Stock</TableCell><TableCell className="font-bold text-right">{formatCurrency(totalClosingStock)}</TableCell></TableRow></TableFooter>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Loan Account</CardTitle>
                        <CardDescription>A log of business loans.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead></TableRow></TableHeader>
                            <TableBody>{paginatedLoanAccount.map(r => <TableRow key={r.id}><TableCell>{format(new Date(r.date), 'PPP')}</TableCell><TableCell>{r.description}</TableCell><TableCell className="text-right">{formatCurrency(r.debit)}</TableCell></TableRow>)}</TableBody>
                            <TableFooter><TableRow><TableCell colSpan={2} className="font-bold text-right">Total Loan</TableCell><TableCell className="font-bold text-right">{formatCurrency(totalLoanDebit)}</TableCell></TableRow></TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Bad and Damage Bread</CardTitle>
                        <CardDescription>A log of bread reported as damaged.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Bread Type</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow></TableHeader>
                            <TableBody>{paginatedBadBread.map(r => <TableRow key={r.id}><TableCell>{r.productName}</TableCell><TableCell className="text-right">{r.quantity}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Discount Allowed</CardTitle>
                        <CardDescription>A log of discounts given on bread types.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Bread Type</TableHead><TableHead className="text-right">Amount (₦)</TableHead></TableRow></TableHeader>
                            <TableBody>{discounts.map(r => <TableRow key={r.id}><TableCell>{r.bread_type}</TableCell><TableCell className="text-right">{formatCurrency(r.amount)}</TableCell></TableRow>)}</TableBody>
                            <TableFooter><TableRow><TableCell className="font-bold text-right">Total Discount</TableCell><TableCell className="font-bold text-right">{formatCurrency(totalDiscounts)}</TableCell></TableRow></TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function WagesTab() {
    const [records, setRecords] = useState<Wage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleRows, setVisibleRows] = useState<number | 'all'>(10);

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
    
    const paginatedRecords = useMemo(() => {
        return visibleRows === 'all' ? records : records.slice(0, visibleRows);
    }, [records, visibleRows]);

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
                            {paginatedRecords.map(r => (
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
            <CardFooter>
                <PaginationControls visibleRows={visibleRows} setVisibleRows={setVisibleRows} totalRows={records.length} />
            </CardFooter>
        </Card>
    );
}

function PnLRow({ label, value, isSubtotal = false, isTotal = false, isFinal = false, isHeader = false }: { label: string, value?: number, isSubtotal?: boolean, isTotal?: boolean, isFinal?: boolean, isHeader?: boolean }) {
    if (isHeader) {
        return (
             <TableRow>
                <TableHead className="font-bold text-base text-foreground">{label}</TableHead>
                <TableHead></TableHead>
            </TableRow>
        )
    }
    return (
        <TableRow className={cn(
            isSubtotal && "border-t",
            (isTotal || isFinal) && "font-bold"
        )}>
            <TableCell className={cn(isSubtotal && "pl-4")}>{label}</TableCell>
            <TableCell className="text-right">{value != null ? formatCurrency(value) : ''}</TableCell>
        </TableRow>
    )
}

function ProfitAndLossTab() {
    const [statement, setStatement] = useState<ProfitAndLossStatement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

    const fetchStatement = useCallback(async (newDate: DateRange | undefined) => {
        setIsLoading(true);
        const range = newDate?.from ? { from: startOfDay(newDate.from), to: endOfDay(newDate.to || newDate.from) } : undefined;
        const data = await getProfitAndLossStatement(range);
        setStatement(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchStatement(date);
    }, [date, fetchStatement]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!statement) return <div>Could not load statement.</div>

    return (
         <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Trading Profit or Loss Account</CardTitle>
                        <CardDescription>For the period ending {date?.to ? format(date.to, 'PPP') : format(new Date(), 'PPP')}</CardDescription>
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="grid md:grid-cols-2 gap-8">
                     {/* Left Column: Revenue & Gross Profit */}
                     <div className="space-y-4">
                        <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Description</TableHead>
                                     <TableHead className="text-right">Amount (₦)</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 <PnLRow label="Opening Stock" value={statement.openingStock} />
                                 <PnLRow label="Add: Purchases" value={statement.purchases} />
                                 <PnLRow label="Add: Carriage Inward" value={statement.carriageInward} isSubtotal />
                                 <PnLRow label="Cost of Goods available for Sale" value={statement.costOfGoodsAvailable} />
                                 <PnLRow label="Less: Closing Stock" value={-statement.closingStock} />
                                 <PnLRow label="Cost of Goods Sold (COGS)" value={statement.cogs} isTotal />
                             </TableBody>
                         </Table>
                         <Table>
                             <TableBody>
                                 <PnLRow label="Sales" value={statement.sales} />
                                 <PnLRow label="Less: COGS" value={-statement.cogs} />
                                 <PnLRow label="Gross Profit" value={statement.grossProfit} isTotal />
                             </TableBody>
                         </Table>
                     </div>
                     {/* Right Column: Expenses & Net Profit */}
                      <div className="space-y-4">
                        <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Expenses</TableHead>
                                     <TableHead className="text-right">Amount (₦)</TableHead>
                                 </TableRow>
                             </TableHeader>
                            <TableBody>
                                {Object.entries(statement.expenses).map(([key, value]) => (
                                    <PnLRow key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value} />
                                ))}
                                <PnLRow label="Total Expenses" value={statement.totalExpenses} isTotal/>
                            </TableBody>
                        </Table>
                        <Table>
                            <TableBody>
                                <PnLRow label="Gross Profit b/d" value={statement.grossProfit} />
                                <PnLRow label="Less: Total Expenses" value={-statement.totalExpenses} />
                                <PnLRow label={statement.netProfit >= 0 ? "Net Profit" : "Net Loss"} value={statement.netProfit} isFinal />
                            </TableBody>
                        </Table>
                     </div>
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
                <TabsTrigger value="pnl">P&amp;L Statement</TabsTrigger>
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
        <TabsContent value="pnl"><ProfitAndLossTab /></TabsContent>
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
