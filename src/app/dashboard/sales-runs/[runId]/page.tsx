
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSalesRunDetails, SalesRun, getCustomersForRun, handleSellToCustomer, handleRecordPaymentForRun } from '@/app/actions';
import { Loader2, ArrowLeft, User, Package, HandCoins, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { collection, getDocs, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Customer = {
  id: string;
  name: string;
};

type RunCustomer = {
    customerId: string;
    customerName: string;
    totalSold: number;
    totalPaid: number;
}

type User = {
    name: string;
    role: string;
    staff_id: string;
};

function SellToCustomerDialog({ run, user, onSaleMade }: { run: SalesRun, user: User | null, onSaleMade: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form state
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [cart, setCart] = useState<{ productId: string, quantity: number, price: number, name: string }[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit'>('Cash');

    useEffect(() => {
        if (isOpen) {
            const fetchCustomers = async () => {
                const snapshot = await getDocs(collection(db, "customers"));
                setCustomers(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
            };
            fetchCustomers();
        }
    }, [isOpen]);

    const handleAddToCart = (item: { productId: string, name: string, price: number, quantity: number }) => {
        setCart(prev => {
            const existing = prev.find(p => p.productId === item.productId);
            if (existing) {
                return prev.map(p => p.productId === item.productId ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(p => p.productId !== productId));
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmit = async () => {
        if (!user) return;
        setIsLoading(true);

        let customerId = selectedCustomerId;
        let customerName = customers.find(c => c.id === customerId)?.name || '';

        if (isNewCustomer) {
            if (!newCustomerName) {
                toast({ variant: 'destructive', title: 'Error', description: 'New customer name is required.' });
                setIsLoading(false);
                return;
            }
            const newCustomerRef = await addDoc(collection(db, "customers"), {
                name: newCustomerName,
                joinedDate: new Date().toISOString(),
                totalSpent: 0,
                amountOwed: 0,
                amountPaid: 0,
            });
            customerId = newCustomerRef.id;
            customerName = newCustomerName;
        }

        if (!customerId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select or create a customer.' });
            setIsLoading(false);
            return;
        }

        const result = await handleSellToCustomer({
            runId: run.id,
            items: cart,
            customerId,
            customerName,
            paymentMethod,
            staffId: user.staff_id,
        });

        if (result.success) {
            toast({ title: 'Success', description: 'Sale recorded successfully.' });
            onSaleMade();
            setIsOpen(false);
            setCart([]);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" className="h-20 flex-col gap-1">
                    <User className="h-5 w-5"/>
                    <span>Sell to Customer</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Record Sale</DialogTitle>
                    <DialogDescription>Select products from this run and sell to a customer.</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 py-4">
                    {/* Left side: Available items */}
                    <div className="space-y-2">
                        <h4 className="font-semibold">Available Items</h4>
                        <div className="border rounded-md max-h-96 overflow-y-auto">
                            {run.items.map(item => (
                                <div key={item.productId} className="p-2 flex justify-between items-center border-b">
                                    <div>
                                        <p>{item.productName}</p>
                                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                    <Button size="icon" variant="outline" onClick={() => handleAddToCart(item)}><PlusCircle className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side: Sale details */}
                    <div className="space-y-4">
                        <h4 className="font-semibold">Sale Details</h4>
                         {/* Customer Selection */}
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select value={selectedCustomerId} onValueChange={v => {setSelectedCustomerId(v); setIsNewCustomer(v === 'new');}}>
                                <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    <SelectItem value="new">Create New Customer</SelectItem>
                                </SelectContent>
                            </Select>
                            {isNewCustomer && <Input placeholder="New customer name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />}
                        </div>

                         {/* Cart */}
                        <div className="border rounded-md p-2 space-y-2 min-h-32">
                           {cart.length === 0 ? <p className="text-center text-muted-foreground text-sm p-4">Cart is empty</p> : (
                                <>
                                    {cart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center">
                                            <span>{item.name} x {item.quantity}</span>
                                            <div className="flex items-center gap-2">
                                                <span>₦{(item.price * item.quantity).toLocaleString()}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveFromCart(item.productId)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                           )}
                        </div>
                         {/* Total and Payment */}
                        <div className="font-bold text-lg flex justify-between">
                            <span>Total:</span>
                            <span>₦{total.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'Cash' | 'Credit')}>
                                <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Credit">Credit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || cart.length === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function RecordPaymentDialog({ run, customers, onPaymentMade }: { run: SalesRun, customers: RunCustomer[], onPaymentMade: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    
    const debtors = customers.filter(c => (c.totalSold - c.totalPaid) > 0);
    const selectedDebtor = debtors.find(d => d.customerId === selectedCustomerId);
    const balance = selectedDebtor ? selectedDebtor.totalSold - selectedDebtor.totalPaid : 0;

    const handleSubmit = async () => {
        if (!selectedCustomerId || !amount || Number(amount) <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a debtor and enter a valid amount.'});
            return;
        }
        if (Number(amount) > balance) {
            toast({ variant: 'destructive', title: 'Error', description: `Cannot pay more than the outstanding balance of ₦${balance.toLocaleString()}.`});
            return;
        }
        setIsLoading(true);
        const result = await handleRecordPaymentForRun({
            runId: run.id,
            customerId: selectedCustomerId,
            amount: Number(amount)
        });
        if (result.success) {
            toast({ title: 'Success', description: 'Payment recorded successfully.' });
            onPaymentMade();
            setIsOpen(false);
            setAmount('');
            setSelectedCustomerId('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" className="h-20 flex-col gap-1">
                    <HandCoins className="h-5 w-5"/>
                    <span>Record Payment</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Customer Payment</DialogTitle>
                    <DialogDescription>Record a payment received for a credit sale on this run.</DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Debtor</Label>
                        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                            <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                            <SelectContent>
                                {debtors.length > 0 ? debtors.map(c => <SelectItem key={c.customerId} value={c.customerId}>{c.customerName} (Owes ₦{(c.totalSold - c.totalPaid).toLocaleString()})</SelectItem>) : <SelectItem value="none" disabled>No debtors for this run</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Amount Paid</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Outstanding: ₦${balance.toLocaleString()}`} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || debtors.length === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SalesRunPage() {
    const params = useParams();
    const runId = params.runId as string;
    const [runDetails, setRunDetails] = useState<SalesRun | null>(null);
    const [runCustomers, setRunCustomers] = useState<RunCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

     const fetchData = async () => {
        if (!runId) return;
        setIsLoading(true);
        const [runData, runCustomersData] = await Promise.all([
            getSalesRunDetails(runId),
            getCustomersForRun(runId)
        ]);
        setRunDetails(runData);
        setRunCustomers(runCustomersData);
        setIsLoading(false);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
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
    const outstandingDebtors = runCustomers.filter(c => (c.totalSold - c.totalPaid) > 0);

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
                    <CardDescription>From: {runDetails.from_staff_name} | To: {runDetails.to_staff_name}</CardDescription>
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
                            <SellToCustomerDialog run={runDetails} user={user} onSaleMade={fetchData}/>
                            <RecordPaymentDialog run={runDetails} customers={runCustomers} onPaymentMade={fetchData}/>
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
                                        <TableCell className="text-right">₦{item.price?.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><User/> Sales Log & Debtors</CardTitle></CardHeader>
                     <CardContent>
                         <Tabs defaultValue="log">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="log">Sales Log</TabsTrigger>
                                <TabsTrigger value="debtors">Outstanding Balances</TabsTrigger>
                            </TabsList>
                             <TabsContent value="log" className="mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {runCustomers.length > 0 ? runCustomers.map(cust => (
                                            <TableRow key={cust.customerId}>
                                                <TableCell>{cust.customerName}</TableCell>
                                                <TableCell className="text-right">₦{cust.totalSold.toLocaleString()}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={2} className="text-center h-24">No sales recorded for this run yet.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                             </TabsContent>
                             <TabsContent value="debtors" className="mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Amount Owing</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                         {outstandingDebtors.length > 0 ? outstandingDebtors.map(cust => (
                                            <TableRow key={cust.customerId}>
                                                <TableCell>{cust.customerName}</TableCell>
                                                <TableCell className="text-right text-destructive">₦{(cust.totalSold - cust.totalPaid).toLocaleString()}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={2} className="text-center h-24">No outstanding debtors for this run.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                             </TabsContent>
                         </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
