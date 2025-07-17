
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, FileDown, Loader2, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import { getAccountingReport, AccountingReport, getCreditors, Creditor, getExpenses, Expense, handleLogPayment, handleAddExpense } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- P&L Components ---
function StatRow({ label, value, isNegative, isBold }: { label: string, value: number, isNegative?: boolean, isBold?: boolean }) {
    const formattedValue = `₦${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const finalValue = isNegative ? `-${formattedValue}` : formattedValue;
    const valueColor = isNegative ? 'text-destructive' : '';
    const fontWeight = isBold ? 'font-bold' : '';

    return (
        <div className={`flex justify-between py-2 text-sm ${fontWeight}`}>
            <span>{label}</span>
            <span className={valueColor}>{finalValue}</span>
        </div>
    );
}

// --- Creditors Components ---
function PayCreditorDialog({ creditor, onPaymentMade }: { creditor: Creditor, onPaymentMade: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState<number | string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid payment amount.' });
            return;
        }
        setIsSubmitting(true);
        const result = await handleLogPayment(creditor.id, Number(amount));
        if (result.success) {
            toast({ title: 'Success', description: 'Payment logged successfully.' });
            onPaymentMade();
            setIsOpen(false);
            setAmount("");
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Make Payment</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay Supplier: {creditor.name}</DialogTitle>
                    <DialogDescription>
                        Log a payment made to this supplier. The amount will be deducted from their balance and added to your expenses.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Label htmlFor="amount">Amount Paid (₦)</Label>
                     <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Balance: ₦${creditor.balance.toLocaleString()}`} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Log Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// --- Expenses Components ---
function AddExpenseDialog({ onExpenseAdded }: { onExpenseAdded: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState<number | string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!description || !category || !amount || Number(amount) <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields with valid values.' });
            return;
        }
        setIsSubmitting(true);
        const result = await handleAddExpense({ description, category, amount: Number(amount) });
        if (result.success) {
            toast({ title: 'Success', description: 'Expense added successfully.' });
            onExpenseAdded();
            setIsOpen(false);
            setDescription("");
            setCategory("");
            setAmount("");
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                    <DialogDescription>Log a new expense for your business.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Utilities">Utilities</SelectItem>
                                    <SelectItem value="Rent">Rent</SelectItem>
                                    <SelectItem value="Salaries">Salaries</SelectItem>
                                    <SelectItem value="Logistics">Logistics</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (₦)</Label>
                            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Expense
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function AccountingPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 1),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(true);
    const [report, setReport] = useState<AccountingReport | null>(null);
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const fetchData = async () => {
        if (!date?.from || !date?.to) return;
        setIsLoading(true);
        const [reportData, creditorsData, expensesData] = await Promise.all([
            getAccountingReport({ from: date.from, to: date.to }),
            getCreditors(),
            getExpenses({ from: date.from, to: date.to })
        ]);
        setReport(reportData);
        setCreditors(creditorsData);
        setExpenses(expensesData);
        setIsLoading(false);
    };
    
    useEffect(() => {
        fetchData();
    }, [date]);

    // --- Content Renderers ---
    const PnLContent = () => {
        if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        if (!report) return <div className="flex items-center justify-center h-96 text-muted-foreground"><p>Could not load accounting report.</p></div>;
        
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Trading Account</h3>
                    <StatRow label="Sales" value={report.sales} />
                    <Separator />
                    <StatRow label="Less: Cost of Goods Sold" value={report.costOfGoodsSold} />
                     <Separator />
                    <StatRow label="Gross Profit" value={report.grossProfit} isNegative={report.grossProfit < 0} isBold />
                </div>
                 <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Profit & Loss Account</h3>
                     <StatRow label="Gross Profit b/f" value={report.grossProfit} isNegative={report.grossProfit < 0} />
                    <Separator />
                    <StatRow label="Less: Expenses" value={report.expenses} />
                    <Separator />
                    <StatRow label={report.netProfit >= 0 ? "Net Profit" : "Net Loss"} value={report.netProfit} isNegative={report.netProfit < 0} isBold />
                </div>
             </div>
        );
    }
    
    const CreditorsContent = () => {
        if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        
        const totalBalance = creditors.reduce((sum, c) => sum + c.balance, 0);

        return (
            <Card>
                <CardHeader><CardTitle>Creditors (Suppliers you owe)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead className="text-right">Total Owed</TableHead>
                                <TableHead className="text-right">Total Paid</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {creditors.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">No outstanding creditors.</TableCell></TableRow>
                            ) : (
                                creditors.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell>{c.contactPerson}</TableCell>
                                        <TableCell className="text-right">₦{c.amountOwed.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">₦{c.amountPaid.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-destructive font-semibold">₦{c.balance.toLocaleString()}</TableCell>
                                        <TableCell className="text-center"><PayCreditorDialog creditor={c} onPaymentMade={fetchData} /></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                         <CardFooter className="p-4 bg-muted/50">
                            <TableRow>
                                <TableCell colSpan={4} className="text-right font-bold">Total Outstanding Balance</TableCell>
                                <TableCell className="text-right font-bold text-destructive">₦{totalBalance.toLocaleString()}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </CardFooter>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    const ExpensesContent = () => {
        if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        return (
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Expenses Log</CardTitle>
                        <CardDescription>
                            All expenses recorded from {date?.from ? format(date.from, "PPP") : ''} to {date?.to ? format(date.to, "PPP") : ''}
                        </CardDescription>
                    </div>
                    <AddExpenseDialog onExpenseAdded={fetchData} />
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No expenses recorded for this period.</TableCell></TableRow>
                            ) : (
                                expenses.map(e => (
                                    <TableRow key={e.id}>
                                        <TableCell>{format(new Date(e.date), 'PPP')}</TableCell>
                                        <TableCell>{e.category}</TableCell>
                                        <TableCell>{e.description}</TableCell>
                                        <TableCell className="text-right">₦{e.amount.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <CardFooter className="p-4 bg-muted/50">
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total Expenses</TableCell>
                                <TableCell className="text-right font-bold">₦{totalExpenses.toLocaleString()}</TableCell>
                            </TableRow>
                        </CardFooter>
                    </Table>
                </CardContent>
            </Card>
        );
    }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Accounting</h1>
          <p className="text-muted-foreground">Manage all financial aspects of your bakery.</p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date range</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export to CSV</Button>
        </div>
      </div>
      
      <Tabs defaultValue="profit-loss">
        <TabsList>
          <TabsTrigger value="profit-loss">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="debtors-creditors">Debtors/Creditors</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payments-requests">Payments &amp; Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="profit-loss" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Trading Profit or Loss Account</CardTitle>
                    <CardDescription>
                       Generated for the period: {date?.from ? format(date.from, "PPP") : ''} - {date?.to ? format(date.to, "PPP") : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PnLContent />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="debtors-creditors" className="mt-4 space-y-4">
            <Card>
                <CardHeader><CardTitle>Debtors (Customers who owe you)</CardTitle></CardHeader>
                 <CardContent className="flex items-center justify-center h-24 text-muted-foreground">
                    <p>No outstanding debtors.</p>
                </CardContent>
            </Card>
            <CreditorsContent />
        </TabsContent>
         <TabsContent value="expenses" className="mt-4">
            <ExpensesContent />
        </TabsContent>
         <TabsContent value="payments-requests" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Payments &amp; Requests</CardTitle>
                    <CardDescription>Coming soon.</CardDescription>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Payment requests and logs will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

