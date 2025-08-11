
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSalesRunDetails, SalesRun, getCustomersForRun, handleSellToCustomer, handleRecordCashPaymentForRun, initializePaystackTransaction, getOrdersForRun } from '@/app/actions';
import { Loader2, ArrowLeft, User, Package, HandCoins, PlusCircle, Trash2, CreditCard, Wallet, Plus, Minus, Printer, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { collection, getDocs, doc, addDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type PaystackPop from '@paystack/inline-js';
import { Separator } from '@/components/ui/separator';
import { format } from "date-fns";


type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

type OrderItem = { productId: string; quantity: number, price: number, name: string };

type CompletedOrder = {
  id: string;
  items: OrderItem[];
  total: number;
  date: string;
  paymentMethod: 'Paystack' | 'Cash' | 'Credit';
  customerName?: string;
}

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
    email: string;
};

const handlePrint = (node: HTMLElement | null) => {
    if (!node) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        const printableContent = `
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: sans-serif; margin: 20px; }
                        .receipt-container { max-width: 300px; margin: auto; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .text-lg { font-size: 1.125rem; }
                        .text-2xl { font-size: 1.5rem; }
                        .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
                        .text-sm { font-size: 0.875rem; }
                        .text-xs { font-size: 0.75rem; }
                        .text-muted-foreground { color: #6b7280; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 4px 0; }
                        .text-right { text-align: right; }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        hr { border: 0; border-top: 1px dashed #d1d5db; margin: 1rem 0; }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        ${node.innerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(printableContent);
        printWindow.document.close();
    }
};

function CreateCustomerDialog({ onCustomerCreated, children }: { onCustomerCreated: (customer: Customer) => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    
    const handleSave = async () => {
        if (!name || !phone) {
            toast({ variant: 'destructive', title: 'Error', description: 'Customer name and phone are required.'});
            return;
        }
        
        try {
            const newCustomerRef = await addDoc(collection(db, "customers"), {
                name,
                phone,
                email,
                address,
                joinedDate: new Date().toISOString(),
                totalSpent: 0,
                amountOwed: 0,
                amountPaid: 0,
            });
            const newCustomer = { id: newCustomerRef.id, name, phone, email, address };
            onCustomerCreated(newCustomer);
            toast({ title: 'Success', description: 'New customer created.' });
            setIsOpen(false);
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create new customer.'});
        }
    }

    return (
       <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                    <DialogDescription>Add a new customer to your database. This will be saved permanently.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Customer Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Email (Optional)</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Address (Optional)</Label>
                        <Input value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Create Customer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function SellToCustomerDialog({ run, user, onSaleMade, remainingItems }: { run: SalesRun, user: User | null, onSaleMade: (order: CompletedOrder) => void, remainingItems: { productId: string; productName: string; price: number; quantity: number }[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCashConfirmOpen, setIsCashConfirmOpen] = useState(false);
    
    // Form state
    const [selectedCustomerId, setSelectedCustomerId] = useState('walk-in');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit' | 'Paystack'>('Cash');
    const [itemQuantities, setItemQuantities] = useState<Record<string, number | string>>({});


    const fetchCustomers = async () => {
        const snapshot = await getDocs(collection(db, "customers"));
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    };

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            setSelectedCustomerId('walk-in');
            setCart([]);
            setPaymentMethod('Cash');
        }
    }, [isOpen]);

    const handleAddToCart = (item: { productId: string, productName: string, price: number, quantity: number }) => {
        const quantityToAdd = Number(itemQuantities[item.productId] || 1);
        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Please enter a valid number.' });
            return;
        }

        const itemInRun = remainingItems.find(p => p.productId === item.productId);
        const itemInCart = cart.find(p => p.productId === item.productId);
        const currentInCart = itemInCart?.quantity || 0;
        const availableStock = itemInRun?.quantity || 0;

        if ((currentInCart + quantityToAdd) > availableStock) {
            toast({ variant: 'destructive', title: 'Stock Limit Exceeded', description: `Only ${availableStock} more units of ${item.productName} available.`});
            return;
        }

        setCart(prev => {
            const existing = prev.find(p => p.productId === item.productId);
            if (existing) {
                return prev.map(p => p.productId === item.productId ? { ...p, quantity: p.quantity + quantityToAdd } : p);
            }
            return [...prev, { productId: item.productId, price: item.price, name: item.productName, quantity: quantityToAdd }];
        });
        setItemQuantities(prev => ({...prev, [item.productId]: ''}));
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(p => p.productId !== productId));
    }

    const updateCartQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveFromCart(productId);
            return;
        }

        const itemInRun = remainingItems.find(p => p.productId === productId);
        if (itemInRun && newQuantity > itemInRun.quantity) {
             toast({ variant: 'destructive', title: 'Stock Limit Exceeded', description: `Only ${itemInRun.quantity} units of ${itemInRun.name} available.`});
             return;
        }

        setCart(prev => prev.map(item => item.productId === productId ? {...item, quantity: newQuantity} : item));
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    const handleSubmit = async () => {
        if (!user) return;

        const customerId = selectedCustomerId;
        const customerName = selectedCustomer?.name || 'Walk-in';

        if (paymentMethod === 'Credit' && customerId === 'walk-in') {
            toast({ variant: 'destructive', title: 'Error', description: 'Credit sales cannot be made to a walk-in customer. Please select a registered customer.' });
            return;
        }

        if (paymentMethod === 'Cash') {
            setIsCashConfirmOpen(true);
            return;
        }
        
        setIsLoading(true);

        const saleData = {
            runId: run.id,
            items: cart,
            customerId: customerId,
            customerName: customerName,
            paymentMethod,
            staffId: user.staff_id,
            total,
        };

        if (paymentMethod === 'Paystack') {
            const customerEmail = selectedCustomer?.email || user.email;
            const paystackResult = await initializePaystackTransaction({
                ...saleData,
                email: customerEmail,
                runId: run.id,
            });

            if (paystackResult.success && paystackResult.reference) {
                const PaystackPop = (await import('@paystack/inline-js')).default;
                const paystack = new PaystackPop();
                paystack.newTransaction({
                    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
                    email: customerEmail,
                    amount: Math.round(total * 100),
                    ref: paystackResult.reference,
                    onSuccess: async (transaction) => {
                        const finalOrder = await handleSellToCustomer(saleData);
                         if (finalOrder.success) {
                            toast({ title: 'Payment Successful', description: 'Order has been completed.' });
                            const completedOrder: CompletedOrder = {
                                id: paystackResult.reference || '',
                                items: cart,
                                total: total,
                                date: new Date().toISOString(),
                                paymentMethod: 'Paystack' as const,
                                customerName: customerName,
                            }
                            onSaleMade(completedOrder);
                            setIsOpen(false);
                        } else {
                            toast({ variant: 'destructive', title: 'Order processing failed', description: finalOrder.error });
                        }
                    },
                    onClose: () => {
                        toast({ variant: 'destructive', title: 'Payment Cancelled' });
                    }
                });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: paystackResult.error });
            }
            setIsLoading(false);
            return;
        }

        // Handle Credit Sale
        const result = await handleSellToCustomer(saleData);

        if (result.success) {
            toast({ title: 'Success', description: 'Credit sale recorded successfully.' });
            onSaleMade({
                id: 'credit-sale-' + Date.now(),
                items: cart,
                total: total,
                date: new Date().toISOString(),
                paymentMethod: 'Credit',
                customerName: customerName,
            });
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    };
    
    const handleCashConfirmation = async () => {
        if (!user) return;
        setIsCashConfirmOpen(false);
        setIsLoading(true);

        const customerId = selectedCustomerId;
        const customerName = selectedCustomer?.name || 'Walk-in';

        const result = await handleSellToCustomer({
            runId: run.id,
            items: cart,
            customerId: customerId,
            customerName: customerName,
            paymentMethod: 'Cash',
            staffId: user.staff_id,
            total,
        });

        if (result.success) {
            toast({ title: 'Pending Approval', description: 'Cash payment has been submitted for accountant approval.' });
            const completedOrder: CompletedOrder = {
                id: 'cash-sale-' + Date.now(),
                items: cart,
                total: total,
                date: new Date().toISOString(),
                paymentMethod: 'Cash' as const,
                customerName: customerName,
            }
            onSaleMade(completedOrder);
            setIsOpen(false);
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
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Record Sale</DialogTitle>
                    <DialogDescription>Select products from this run and sell to a customer.</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 py-4">
                    {/* Left side: Available items */}
                    <div className="space-y-2">
                        <h4 className="font-semibold">Available Items</h4>
                        <div className="border rounded-md max-h-96 overflow-y-auto">
                            {remainingItems.map(item => (
                                <div key={item.productId} className="p-2 flex justify-between items-center border-b gap-2">
                                    <div>
                                        <p>{item.productName}</p>
                                        <p className="text-sm text-muted-foreground">In Stock: {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            className="w-20 h-9" 
                                            placeholder="1"
                                            value={itemQuantities[item.productId] || ''}
                                            onChange={(e) => setItemQuantities(prev => ({...prev, [item.productId]: e.target.value}))}
                                            min="1"
                                        />
                                        <Button size="icon" variant="outline" onClick={() => handleAddToCart(item)}><PlusCircle className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side: Sale details */}
                    <div className="space-y-4">
                        <h4 className="font-semibold">Sale Details</h4>
                         {/* Customer Selection */}
                        <div className="space-y-2">
                            <Label>Customer (Optional for cash/Paystack)</Label>
                             <div className="flex gap-2">
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <CreateCustomerDialog onCustomerCreated={(newCust) => {
                                    fetchCustomers();
                                    setSelectedCustomerId(newCust.id);
                                }}>
                                    <Button variant="outline">New</Button>
                                </CreateCustomerDialog>
                            </div>
                        </div>

                         {/* Cart */}
                        <div className="border rounded-md p-2 space-y-2 min-h-32">
                           {cart.length === 0 ? <p className="text-center text-muted-foreground text-sm p-4">Cart is empty</p> : (
                                <>
                                    {cart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center text-sm">
                                            <span className="flex-1">{item.name}</span>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                                <span className="font-bold">{item.quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <span className="w-20 text-right font-medium">₦{(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <Separator />
                                    <div className="font-bold text-right">Total: ₦{total.toLocaleString()}</div>
                                </>
                            )}
                        </div>

                         {/* Payment Options */}
                         <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select onValueChange={(value) => setPaymentMethod(value as 'Cash' | 'Credit' | 'Paystack')} defaultValue={paymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash"><Wallet className="mr-2 h-4 w-4"/> Cash</SelectItem>
                                    <SelectItem value="Paystack"><ArrowRightLeft className="mr-2 h-4 w-4"/> Pay with Paystack</SelectItem>
                                    <SelectItem value="Credit" disabled={selectedCustomerId === 'walk-in'}><CreditCard className="mr-2 h-4 w-4"/> Credit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={isLoading} onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading || cart.length === 0} onClick={handleSubmit}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Record Sale
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>

               <AlertDialog open={isCashConfirmOpen} onOpenChange={setIsCashConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Cash Payment</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to record this sale as a cash payment?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsCashConfirmOpen(false)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCashConfirmation}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
        </Dialog>
    );
}

function SalesRunDetails() {
    const { runId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [run, setRun] = useState<SalesRun | null>(null);
    const [orders, setOrders] = useState<CompletedOrder[]>([]);
    const [customers, setCustomers] = useState<RunCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [isSettling, setIsSettling] = useState(false);
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [newDebtPaymentAmount, setNewDebtPaymentAmount] = useState('');
    const [paymentConfirmations, setPaymentConfirmations] = useState<any[]>([]);

    useEffect(() => {
      const userJSON = localStorage.getItem('loggedInUser');
      if (userJSON) {
          setUser(JSON.parse(userJSON));
      }
    }, []);

    const fetchRunDetails = async () => {
        setIsLoading(true);
        try {
            const runDetails = await getSalesRunDetails(runId as string);
            if (runDetails) {
                setRun(runDetails);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Run not found.' });
                router.push('/dashboard');
                return;
            }

            const customerDetails = await getCustomersForRun(runId as string);
            setCustomers(customerDetails);

            const orderDetails = await getOrdersForRun(runId as string);
             setOrders(orderDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            const salesRunDoc = doc(db, "transfers", runId as string);
            const unsubscribe = onSnapshot(salesRunDoc, (doc) => {
                if (doc.exists()) {
                     const plainData: { [key: string]: any } = {};
                    const data = doc.data();
                    for (const key in data) {
                        if (data[key] instanceof Timestamp) {
                            plainData[key] = (data[key] as Timestamp).toDate().toISOString();
                        } else {
                            plainData[key] = data[key];
                        }
                    }
                    setRun(prevRun => ({ ...prevRun, ...plainData } as SalesRun));
                }
            });

            // Subscribe to cash payment confirmation requests
            const paymentConfirmationCollection = collection(db, 'payment_confirmations');
            const unsubscribePaymentConfirmations = onSnapshot(paymentConfirmationCollection, (snapshot) => {
                const payments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
                    .filter(payment => payment.runId === runId && payment.status === 'pending')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setPaymentConfirmations(payments);
            });
            
            return () => {
                unsubscribe();
                unsubscribePaymentConfirmations();
            };
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch run details.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const performFetch = async () => {
            const unsub = await fetchRunDetails();
            return unsub;
        };
        const unsubPromise = performFetch();
        
        return () => {
            unsubPromise.then(unsub => {
                if(unsub) unsub();
            });
        }
    }, [runId, router, toast]);
    
    const totalSold = useMemo(() => customers.reduce((sum, cust) => sum + cust.totalSold, 0), [customers]);
    const totalCollected = useMemo(() => run?.totalCollected || 0, [run]);
    const runStatus = useMemo(() => run?.status || 'inactive', [run]);
    
    const handleRecordDebtPayment = async () => {
        if (!user) return;
        if (!newDebtPaymentAmount || isNaN(Number(newDebtPaymentAmount))) {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid amount.' });
            return;
        }

        const amount = Number(newDebtPaymentAmount);
        setIsSettling(true);
        try {
            // This function needs to be updated to handle any customer, not just from a fixed list
            // For now, let's assume it can take a name
            const result = await handleRecordCashPaymentForRun({
                runId: runId as string,
                customerId: 'multiple', // Placeholder
                customerName: 'Debt Settlement',
                driverId: run?.to_staff_id || '',
                driverName: run?.to_staff_name || '',
                amount,
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Debt payment recorded for approval.' });
                setNewDebtPaymentAmount('');
                fetchRunDetails(); // Refresh the run details
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to record debt payment.' });
        } finally {
            setIsSettling(false);
        }
    };
    
     const handleSaleMade = (newOrder: CompletedOrder) => {
         setOrders(prev => [newOrder, ...prev]);
         fetchRunDetails();
     }
    
     const getRemainingItems = () => {
        if (!run || !run.items) return [];

        const soldQuantities: { [key: string]: number } = {};
        if (Array.isArray(orders)) {
            orders.forEach(order => {
                if (Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        soldQuantities[item.productId] = (soldQuantities[item.productId] || 0) + item.quantity;
                    });
                }
            });
        }
        
        return run.items.map(item => {
            const soldQuantity = soldQuantities[item.productId] || 0;
            const remainingQuantity = item.quantity - soldQuantity;
            return {
                ...item,
                quantity: remainingQuantity > 0 ? remainingQuantity : 0,
            };
        }).filter(item => item.quantity > 0);
    };

    const remainingItems = useMemo(getRemainingItems, [run, orders]);

    if (isLoading || !run) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    const runComplete = runStatus === 'completed';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Link href="/dashboard/deliveries" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Deliveries</Link>
                 <Button variant="ghost" size="sm" onClick={() => handlePrint(receiptRef.current)} disabled={!runComplete}>
                    <Printer className={`mr-2 h-4 w-4`} /> Print
                </Button>
            </div>
             <div ref={receiptRef} className="hidden">
                 <div className="receipt-container">
                    <div className="text-center">
                        <div className="font-bold text-2xl">Your Bakery Name</div>
                        <div className="text-sm text-muted-foreground">123 Main Street, City</div>
                         <div className="text-xs text-muted-foreground">Date: {format(new Date(), 'Pp')}</div>
                         <div className="my-4">
                            <div className="font-bold text-lg">Sales Run Summary</div>
                        </div>
                    </div>
                    <hr />
                     <div>
                        <div className="flex justify-between text-sm">
                            <span>Run ID:</span>
                            <span>{runId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Start Time:</span>
                            <span>{run.date ? format(new Date(run.date), 'Pp') : 'N/A'}</span>
                        </div>
                         <div className="flex justify-between text-sm">
                            <span>Driver:</span>
                            <span>{run.to_staff_name}</span>
                        </div>
                    </div>
                    <hr />
                     <div>
                        <div className="flex justify-between text-sm">
                            <span>Total Sold:</span>
                            <span className="font-bold">₦{totalSold.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Total Collected:</span>
                            <span className="font-bold">₦{totalCollected.toLocaleString()}</span>
                        </div>
                    </div>
                    <hr />
                     <div className="text-xs text-muted-foreground text-center">Thank you for your business!</div>
                </div>
             </div>

            <h1 className="text-2xl font-bold font-headline">Sales Run: {(runId as string).substring(0,8)}...</h1>
             {runComplete && <Badge variant="outline">Completed</Badge>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Run Summary</CardTitle>
                        <CardDescription>Overview of this sales run.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between"><span>Status:</span> <Badge>{runStatus}</Badge></div>
                        <div className="flex justify-between"><span>Start Time:</span> <span>{run.date ? format(new Date(run.date), 'PPP') : 'N/A'}</span></div>
                         <div className="flex justify-between"><span>Driver:</span> <span>{run.to_staff_name}</span></div>
                        <div><Progress value={(totalCollected / (run.totalRevenue || 1)) * 100} /></div>
                        <div className="text-sm text-muted-foreground">Collection Progress</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sales Performance</CardTitle>
                        <CardDescription>Key metrics from this run.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between"><span>Total Revenue:</span> <span>₦{run.totalRevenue.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Total Collected:</span> <span>₦{totalCollected.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Outstanding Debt:</span> <span>₦{(run.totalOutstanding).toLocaleString()}</span></div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage this sales run.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <SellToCustomerDialog run={run} user={user} onSaleMade={handleSaleMade} remainingItems={remainingItems}/>
                         {runComplete ? <Button variant="secondary" disabled>Run Completed</Button> : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" disabled={remainingItems.length > 0}>Complete Run</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. All remaining items will be marked as returned and this run will be closed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => router.push(`/dashboard/complete-run/${runId}`)}>Complete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="customers" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                        Pending Confirmations
                        {paymentConfirmations.length > 0 && <Badge variant="destructive" className="ml-2">{paymentConfirmations.length}</Badge>}
                    </TabsTrigger>
                </TabsList>
                 <TabsContent value="customers">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customers</CardTitle>
                            <CardDescription>All customers in this run.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="text-right">Total Sold</TableHead>
                                        <TableHead className="text-right">Total Paid</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map(customer => (
                                        <TableRow key={customer.customerId}>
                                            <TableCell>{customer.customerName}</TableCell>
                                            <TableCell className="text-right">₦{customer.totalSold.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">₦{customer.totalPaid.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {!runComplete && (
                            <CardFooter className="flex justify-end gap-2">
                                <Input type="number" placeholder="Enter amount" value={newDebtPaymentAmount} onChange={(e) => setNewDebtPaymentAmount(e.target.value)} />
                                <Button onClick={handleRecordDebtPayment} disabled={isSettling}>{isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record Payment</Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>
                 <TabsContent value="sales">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales</CardTitle>
                            <CardDescription>All sales made in this run.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>{format(new Date(order.date), 'PPP')}</TableCell>
                                            <TableCell>{order.customerName}</TableCell>
                                            <TableCell className="text-right">₦{order.total.toLocaleString()}</TableCell>
                                            <TableCell>{order.paymentMethod}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="pending">
                     <Card>
                        <CardHeader>
                            <CardTitle>Pending Confirmations</CardTitle>
                            <CardDescription>Pending payment confirmations</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentConfirmations.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>{order.date ? format(order.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>{order.customerName}</TableCell>
                                            <TableCell className="text-right">₦{order.amount.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default SalesRunDetails;

    