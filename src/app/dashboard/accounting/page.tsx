
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Calendar as CalendarIcon, FileDown, Loader2, PlusCircle, Users, RefreshCw, MoreVertical, DollarSign } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import { getCreditors, Creditor, getExpenses, Expense, handleLogPayment, handleAddExpense, getPaymentConfirmations, PaymentConfirmation, handlePaymentConfirmation, getDebtors, Debtor, getSalesStats } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

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

function PaymentsAndRequestsContent({ onDataChange }: { onDataChange: () => void }) {
    const { toast } = useToast();
    const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
    const [resolved, setResolved] = useState<PaymentConfirmation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionState, setActionState] = useState<{ id: string, type: 'approve' | 'decline' } | null>(null);

    const fetchConfirmations = async () => {
        setIsLoading(true);
        const allData = await getPaymentConfirmations();
        setConfirmations(allData.filter(d => d.status === 'pending'));
        setResolved(allData.filter(d => d.status !== 'pending'));
        setIsLoading(false);
    }
    
    useEffect(() => {
        fetchConfirmations();
    }, []);

    const handleAction = async () => {
        if (!actionState) return;
        const { id, type } = actionState;

        const result = await handlePaymentConfirmation(id, type);
        if (result.success) {
            toast({ title: 'Success', description: `Payment has been ${type}d.` });
            onDataChange();
             // Dispatch a custom event to notify other components like the dashboard
            window.dispatchEvent(new CustomEvent('dataChanged'));
            fetchConfirmations();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setActionState(null);
    }

    if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <AlertDialog open={!!actionState} onOpenChange={() => setActionState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to {actionState?.type} this payment confirmation. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAction}>Yes, {actionState?.type}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Card>
                <CardHeader>
                    <CardTitle>Pending Payment Confirmations</CardTitle>
                    <CardDescription>Review and approve payments reported by delivery staff for credit sales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Run ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {confirmations.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No pending payment confirmations.</TableCell></TableRow>
                            ) : (
                                confirmations.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>{format(new Date(c.date), 'PPp')}</TableCell>
                                        <TableCell>{c.driverName}</TableCell>
                                        <TableCell>{c.runId ? `${c.runId.substring(0, 7)}...` : 'N/A'}</TableCell>
                                        <TableCell>₦{c.amount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="destructive" size="sm" onClick={() => setActionState({ id: c.id, type: 'decline' })}>Decline</Button>
                                            <Button size="sm" onClick={() => setActionState({ id: c.id, type: 'approve' })}>Approve</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Tabs defaultValue="resolved-requests">
                <TabsList>
                    <TabsTrigger value="resolved-requests">Resolved Requests Log</TabsTrigger>
                </TabsList>
                <TabsContent value="resolved-requests">
                     <Card>
                        <CardHeader>
                            <CardTitle>Resolved Requests</CardTitle>
                            <CardDescription>A log of all previously approved and declined payment requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {resolved.length > 0 ? (
                                        resolved.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell>{format(new Date(c.date), 'PPp')}</TableCell>
                                                <TableCell>{c.driverName}</TableCell>
                                                <TableCell>₦{c.amount.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={c.status === 'approved' ? 'default' : 'destructive'}>{c.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No resolved requests yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AccountingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const fetchData = async () => {
        setIsLoading(true);

        const [creditorsData, expensesData, debtorsData] = await Promise.all([
            getCreditors(),
            getExpenses({ from: subMonths(new Date(), 1).toISOString(), to: new Date().toISOString() }), // Default for now
            getDebtors(),
        ]);
        
        setCreditors(creditorsData);
        setDebtors(debtorsData);
        setExpenses(expensesData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
        const handleDataChange = () => fetchData();
        window.addEventListener('dataChanged', handleDataChange);
        return () => window.removeEventListener('dataChanged', handleDataChange);
    }, []);

    // --- Content Renderers ---
    const DebtorsContent = () => {
        const totalBalance = debtors.reduce((sum, d) => sum + d.balance, 0);
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Debtors (Customers who owe you)</CardTitle>
                    <CardDescription>A list of all customers with an outstanding balance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Total Owed</TableHead>
                                <TableHead className="text-right">Total Paid</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {debtors.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No outstanding debtors.</TableCell></TableRow>
                            ) : (
                                debtors.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-medium">{d.name}</TableCell>
                                        <TableCell>{d.phone}</TableCell>
                                        <TableCell className="text-right">₦{d.amountOwed.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">₦{d.amountPaid.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-destructive font-semibold">₦{d.balance.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="font-bold text-right">Total Outstanding Balance</TableCell>
                                <TableCell className="text-right font-bold text-destructive">₦{totalBalance.toLocaleString()}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    const CreditorsContent = () => {
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
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="text-right font-bold">Total Outstanding Balance</TableCell>
                                <TableCell className="text-right font-bold text-destructive">₦{totalBalance.toLocaleString()}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    const ExpensesContent = () => {
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        return (
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Expenses Log</CardTitle>
                        <CardDescription>
                            All expenses recorded for the last 30 days.
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
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total Expenses</TableCell>
                                <TableCell className="text-right font-bold">₦{totalExpenses.toLocaleString()}</TableCell>
                            </TableRow>
                        </TableFooter>
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
      </div>
      
      <Tabs defaultValue="debtors-creditors">
        <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="debtors-creditors">Debtors/Creditors</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="payments-requests">Payments &amp; Requests</TabsTrigger>
            </TabsList>
            <Button variant="ghost" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
        </div>
         <TabsContent value="debtors-creditors" className="mt-4 space-y-4">
            {isLoading ? <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div> : <>
                <DebtorsContent />
                <CreditorsContent />
            </>}
        </TabsContent>
         <TabsContent value="expenses" className="mt-4">
            {isLoading ? <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div> : <ExpensesContent />}
        </TabsContent>
         <TabsContent value="payments-requests" className="mt-4">
            <PaymentsAndRequestsContent onDataChange={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
