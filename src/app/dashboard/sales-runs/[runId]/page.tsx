
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSalesRunDetails, SalesRun, getCustomersForRun, handleSellToCustomer, handleRecordCashPaymentForRun, initializePaystackTransaction, getOrdersForRun } from '@/app/actions';
import { Loader2, ArrowLeft, User, Package, HandCoins, PlusCircle, Trash2, CreditCard, Wallet, Plus, Minus, Printer, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { collection, getDocs, doc, Timestamp, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { format } from "date-fns";


type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

type OrderItem = { productId: string; quantity: number, price: number, name: string, costPrice: number };

type CompletedOrder = {
  id: string;
  items: OrderItem[];
  total: number;
  date: Date;
  paymentMethod: 'Paystack' | 'Cash' | 'Credit';
  customerName?: string;
  subtotal: number;
  tax: number;
  status: string;
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
    email: string;
};

const formatCurrency = (amount?: number) => `₦${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                        .page-break-before-always { page-break-before: always; }
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

const Receipt = React.forwardRef<HTMLDivElement, { order: CompletedOrder, storeAddress?: string }>(({ order, storeAddress }, ref) => {
  return (
    <div ref={ref} className="p-2">
      <div className="text-center mb-4">
          <h2 className="font-headline text-xl text-center">BMS</h2>
          <p className="text-center text-sm">Sale Receipt</p>
          {storeAddress && <p className="text-center text-xs text-muted-foreground">{storeAddress}</p>}
        </div>
        <div className="py-2 space-y-2 text-xs">
            <div className="space-y-1">
                <p><strong>Order ID:</strong> {order.id.substring(0, 12)}...</p>
                <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                <p><strong>Customer:</strong> {order.customerName || 'Walk-in'}</p>
            </div>
            <Separator className="my-2" />
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="h-auto p-1 text-xs">Item</TableHead>
                    <TableHead className="text-center h-auto p-1 text-xs">Qty</TableHead>
                    <TableHead className="text-right h-auto p-1 text-xs">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map((item, index) => (
                    <TableRow key={item.productId || index}>
                        <TableCell className="p-1 text-xs">{item.name}</TableCell>
                        <TableCell className="text-center p-1 text-xs">{item.quantity}</TableCell>
                        <TableCell className="text-right p-1 text-xs">₦{(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
                <Separator className="my-2"/>
                <div className="w-full space-y-1 pr-1">
                <div className="flex justify-between font-bold text-base mt-1">
                    <span>Total</span>
                    <span>₦{order.total.toFixed(2)}</span>
                </div>
            </div>
            <Separator className="my-2"/>
            <p className="text-center text-xs text-muted-foreground">Thank you for your patronage!</p>
        </div>
    </div>
  );
});
Receipt.displayName = 'Receipt';

function CreateCustomerDialog({ onCustomerCreated, children }: { onCustomerCreated: (customer: Customer) => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    
    const handleSave = async () => {
        if (!name || !phone || !email) {
            toast({ variant: 'destructive', title: 'Error', description: 'Customer name, phone, and email are required.'});
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
                        <Label htmlFor="create-customer-name">Customer Name</Label>
                        <Input id="create-customer-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="create-customer-phone">Phone Number</Label>
                        <Input id="create-customer-phone" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="create-customer-email">Email</Label>
                        <Input id="create-customer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-customer-address">Address (Optional)</Label>
                        <Input id="create-customer-address" value={address} onChange={e => setAddress(e.target.value)} />
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

function SellToCustomerDialog({ run, user, onSaleMade, remainingItems }: { run: SalesRun, user: User | null, onSaleMade: (order: CompletedOrder) => void, remainingItems: { productId: string; productName: string; price: number; quantity: number, costPrice?: number }[] }) {
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

    const handleAddToCart = (item: { productId: string, productName: string, price: number, quantity: number, costPrice?: number }) => {
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
                return prev.map(p => p.productId === item.productId ? { ...p, price: item.price, quantity: p.quantity + quantityToAdd } : p);
            }
            return [...prev, { productId: item.productId, price: item.price, name: item.productName, quantity: quantityToAdd, costPrice: item.costPrice || 0 }];
        });
        setItemQuantities(prev => ({...prev, [item.productId]: ''}));
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(p => p.productId !== productId));
    }

    const updateCartQuantity = (productId: string, newQuantity: number) => {
        const itemInCart = cart.find(p => p.productId === productId);
        if (!itemInCart) return;

        if (newQuantity <= 0) {
            handleRemoveFromCart(productId);
            return;
        }

        const itemInRun = remainingItems.find(p => p.productId === productId);
        const availableStock = itemInRun?.quantity || 0;
        const otherItemsInCart = cart.filter(p => p.productId !== productId);
        const stockInOtherCarts = otherItemsInCart.reduce((sum, item) => sum + (item.productId === productId ? item.quantity : 0), 0);

        if (newQuantity > (availableStock - stockInOtherCarts)) {
             toast({ variant: 'destructive', title: 'Stock Limit Exceeded', description: `Only ${availableStock} units of ${itemInRun?.productName} available in total.`});
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
             const itemsForPaystack = cart.map(item => ({
                id: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                costPrice: item.costPrice
            }));

            // Close the current dialog before opening paystack
            setIsOpen(false);
            
            const loadingToast = toast({
                title: "Initializing Payment...",
                description: "Please wait while we connect to Paystack.",
                duration: Infinity,
            });

            const paystackResult = await initializePaystackTransaction({
                email: customerEmail,
                total: total,
                customerName: customerName,
                staffId: user.staff_id,
                items: itemsForPaystack,
            });

            loadingToast.dismiss();

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
                                id: finalOrder.orderId || paystackResult.reference || '',
                                items: cart,
                                total: total,
                                date: new Date(),
                                paymentMethod: 'Paystack' as const,
                                customerName: customerName,
                                subtotal: 0, tax: 0, status: 'Completed'
                            }
                            onSaleMade(completedOrder);
                        } else {
                            toast({ variant: 'destructive', title: 'Order processing failed', description: finalOrder.error });
                        }
                    },
                    onClose: () => {
                        toast({ variant: "destructive", title: "Payment Cancelled" });
                    }
                });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: paystackResult.error });
            }
            setIsLoading(false);
            return;
        }

        // Handle Credit Sale
        setIsLoading(true);
        const result = await handleSellToCustomer(saleData);

        if (result.success) {
            toast({ title: 'Success', description: 'Credit sale recorded successfully.' });
            onSaleMade({
                id: result.orderId || 'credit-sale-' + Date.now(),
                items: cart,
                total: total,
                date: new Date(),
                paymentMethod: 'Credit',
                customerName: customerName,
                subtotal: 0, tax: 0, status: 'Completed'
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
                date: new Date(),
                paymentMethod: 'Cash' as const,
                customerName: customerName,
                subtotal: 0, tax: 0, status: 'Pending'
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
                <AlertDialog open={isCashConfirmOpen} onOpenChange={setIsCashConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Cash Payment</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to record this sale as a cash payment? This will be sent for accountant approval.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsCashConfirmOpen(false)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCashConfirmation}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}

function RecordPaymentDialog({ customer, run, user }: { customer: RunCustomer, run: SalesRun, user: User | null }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState<number | string>('');
    const [isSettling, setIsSettling] = useState(false);

    const outstanding = customer.totalSold - customer.totalPaid;

    const handleRecordPayment = async () => {
        if (!user || !run) return;
        const paymentAmount = Number(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid amount.' });
            return;
        }
        if (paymentAmount > outstanding) {
            toast({ variant: 'destructive', title: 'Error', description: `Payment cannot exceed outstanding balance of ₦${outstanding.toLocaleString()}.` });
            return;
        }

        setIsSettling(true);
        try {
            const result = await handleRecordCashPaymentForRun({
                runId: run.id,
                customerId: customer.customerId,
                customerName: customer.customerName,
                driverId: run.to_staff_id,
                driverName: run.to_staff_name || 'Unknown Driver',
                amount: paymentAmount,
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Debt payment recorded for approval.' });
                setAmount('');
                setIsOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to record debt payment.' });
        } finally {
            setIsSettling(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for {customer.customerName}</DialogTitle>
                    <DialogDescription>
                        Outstanding Amount: <span className="font-bold text-destructive">₦{outstanding.toLocaleString()}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="payment-amount">Amount Received (₦)</Label>
                    <Input id="payment-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleRecordPayment} disabled={isSettling}>
                        {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for Approval
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CustomerOrdersDialog({ isOpen, onOpenChange, customer, orders }: { isOpen: boolean, onOpenChange: (open: boolean) => void, customer: RunCustomer | null, orders: CompletedOrder[] }) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [ordersToPrint, setOrdersToPrint] = useState<CompletedOrder[]>([]);
    const [viewingOrder, setViewingOrder] = useState<CompletedOrder | null>(null);

    const customerOrders = useMemo(() => {
        if (!customer) return [];
        return orders.filter(order => order.customerName === customer.customerName);
    }, [customer, orders]);

    useEffect(() => {
        if (ordersToPrint.length > 0 && receiptRef.current) {
            handlePrint(receiptRef.current);
            setOrdersToPrint([]);
        }
    }, [ordersToPrint]);
    
    if (!customer) return null;

    const handlePrintAll = () => {
        setOrdersToPrint(customerOrders);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Order History for {customer.customerName}</DialogTitle>
                        <DialogDescription>Showing all orders for this customer within this sales run.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerOrders.length > 0 ? customerOrders.map(order => (
                                    <TableRow key={order.id} onClick={() => setViewingOrder(order)} className="cursor-pointer">
                                        <TableCell>{format(new Date(order.date), 'Pp')}</TableCell>
                                        <TableCell>{order.items.reduce((sum, i) => sum + i.quantity, 0)}</TableCell>
                                        <TableCell><Badge variant="secondary">{order.paymentMethod}</Badge></TableCell>
                                        <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No orders found for this customer.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="justify-between">
                         <Button variant="outline" onClick={handlePrintAll} disabled={customerOrders.length === 0}>
                            <Printer className="mr-2 h-4 w-4"/> Print Receipts
                        </Button>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>
                            Receipt for order {viewingOrder?.id.substring(0,8)}...
                        </DialogDescription>
                    </DialogHeader>
                    {viewingOrder && <Receipt order={viewingOrder} />}
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setViewingOrder(null)}>Close</Button>
                        <Button onClick={() => handlePrint(receiptRef.current)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="hidden">
                <div ref={receiptRef}>
                    {ordersToPrint.length > 0 && ordersToPrint.map((order, index) => (
                        <div key={order.id} className={index > 0 ? "page-break-before-always" : ""}>
                             <Receipt order={order} />
                        </div>
                    ))}
                    {viewingOrder && <Receipt order={viewingOrder} />}
                </div>
            </div>
        </>
    )
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
    const [viewingOrder, setViewingOrder] = useState<CompletedOrder | null>(null);
    const [viewingCustomer, setViewingCustomer] = useState<RunCustomer | null>(null);
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [paymentConfirmations, setPaymentConfirmations] = useState<any[]>([]);

    useEffect(() => {
      const userJSON = localStorage.getItem('loggedInUser');
      if (userJSON) {
          setUser(JSON.parse(userJSON));
      }
    }, []);

    useEffect(() => {
        const runDocRef = doc(db, "transfers", runId as string);
        const unsubscribeRun = onSnapshot(runDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const runDetails = await getSalesRunDetails(runId as string);
                setRun(runDetails);
            }
        });

        const runOrdersQuery = query(collection(db, 'orders'), where('salesRunId', '==', runId as string));
        const unsubscribeOrders = onSnapshot(runOrdersQuery, async (snapshot) => {
            const orderDetails = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    ...data, 
                    id: doc.id,
                    date: (data.date as Timestamp)?.toDate() || new Date()
                } as CompletedOrder
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setOrders(orderDetails);

            const customerDetails = await getCustomersForRun(runId as string);
            setCustomers(customerDetails);
        });
        
        const paymentConfirmationCollection = collection(db, 'payment_confirmations');
        const unsubscribePaymentConfirmations = onSnapshot(paymentConfirmationCollection, (snapshot) => {
            const payments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
                .filter(payment => payment.runId === runId && payment.status === 'pending')
                .sort((a, b) => {
                    const dateA = a.date?.toDate ? a.date.toDate() : new Date(0);
                    const dateB = b.date?.toDate ? b.date.toDate() : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });
            setPaymentConfirmations(payments);
        });
        
        if (isLoading) setIsLoading(false);
        
        return () => {
            unsubscribeRun();
            unsubscribeOrders();
            unsubscribePaymentConfirmations();
        };
    }, [runId, isLoading]);
    
    const totalSold = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
    const totalCollected = useMemo(() => run?.totalCollected || 0, [run]);
    const runStatus = useMemo(() => run?.status || 'inactive', [run]);
    
    const handleSaleMade = (newOrder: CompletedOrder) => {
         // The real-time listener will handle the update
         if (newOrder.paymentMethod === 'Paystack') {
            setViewingOrder(newOrder);
         }
     }
    
     const getRemainingItems = useCallback(() => {
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
                price: item.price || 0,
                quantity: remainingQuantity > 0 ? remainingQuantity : 0,
            };
        }).filter(item => item.quantity > 0);
    }, [run, orders]);

    const remainingItems = useMemo(getRemainingItems, [getRemainingItems]);

    if (isLoading || !run) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    const runComplete = runStatus === 'completed';
    const isRunActive = runStatus === 'active';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Link href="/dashboard/deliveries" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Deliveries</Link>
                 <Button variant="ghost" size="sm" onClick={() => handlePrint(receiptRef.current)} disabled={!runComplete}>
                    <Printer className={`mr-2 h-4 w-4`} /> Print Run Summary
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
                                <AlertDialogTrigger asChild><Button variant="destructive" disabled={isRunActive && remainingItems.length > 0}>Complete Run</Button></AlertDialogTrigger>
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
                                        <TableHead className="text-right">Outstanding</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map(customer => {
                                        const outstanding = customer.totalSold - customer.totalPaid;
                                        return (
                                            <TableRow key={customer.customerId} onClick={() => setViewingCustomer(customer)} className="cursor-pointer">
                                                <TableCell>{customer.customerName}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(customer.totalSold)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(customer.totalPaid || 0)}</TableCell>
                                                <TableCell className="text-right font-bold text-destructive">
                                                    {outstanding > 0 ? formatCurrency(outstanding) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    {outstanding > 0 && isRunActive && (
                                                        <RecordPaymentDialog customer={customer} run={run} user={user} />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
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
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map(order => (
                                        <TableRow key={order.id} className="cursor-pointer" onClick={() => setViewingOrder(order)}>
                                            <TableCell>{format(new Date(order.date), 'PPP')}</TableCell>
                                            <TableCell>{order.customerName}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                            <TableCell>{order.paymentMethod}</TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="sm">View</Button></TableCell>
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
                            <CardDescription>Cash payments awaiting accountant approval.</CardDescription>
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
                                            <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <CustomerOrdersDialog isOpen={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)} customer={viewingCustomer} orders={orders} />

            <Dialog open={!!viewingOrder} onOpenChange={setViewingOrder}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>
                            Receipt for order {viewingOrder?.id.substring(0,8)}...
                        </DialogDescription>
                    </DialogHeader>
                    {viewingOrder && <Receipt order={viewingOrder} ref={receiptRef} />}
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setViewingOrder(null)}>Close</Button>
                        <Button onClick={() => handlePrint(receiptRef.current)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default SalesRunDetails;
