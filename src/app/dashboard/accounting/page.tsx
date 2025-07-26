
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2, DollarSign, Receipt, Users, TrendingDown, TrendingUp, HandCoins, MinusCircle, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFinancialSummary, getDebtRecords, getDirectCosts, getIndirectCosts, getClosingStocks, getWages } from '@/app/actions';

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

    useEffect(() => {
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
                    <CardHeader><CardTitle>Direct Costs</CardTitle></CardHeader>
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
                    <CardHeader><CardTitle>Indirect Costs</CardTitle></CardHeader>
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
