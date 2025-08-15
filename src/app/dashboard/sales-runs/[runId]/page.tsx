
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSalesRunDetails, SalesRun, getCustomersForRun, handleSellToCustomer, handleRecordCashPaymentForRun, initializePaystackTransaction, getOrdersForRun, verifyPaystackOnServerAndFinalizeOrder, handleCompleteRun, handleReturnStock, handleReportWaste } from '@/app/actions';
import { Loader2, ArrowLeft, User, Package, HandCoins, PlusCircle, Trash2, CreditCard, Wallet, Plus, Minus, Printer, ArrowRightLeft, ArrowUpDown, RefreshCw, Undo2, CheckCircle, Trash, SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { collection, doc, Timestamp, onSnapshot, query, where, addDoc, getDoc, getDocs } from 'firebase/firestore';
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

type OrderItem = { productId: string; quantity: number, price: number, name: string, costPrice?: number };

type CompletedOrder = {
  id: string;
  items: OrderItem[];
  total: number;
  date: Date;
  paymentMethod: 'Paystack' | 'Cash' | 'Credit' | 'POS';
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

type SortKey = 'customerName' | 'totalSold' | 'totalPaid' | 'outstanding';
type SortDirection = 'asc' | 'desc';

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
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form state
    const [selectedCustomerId, setSelectedCustomerId] = useState('walk-in');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit' | 'Paystack' | 'POS'>('Cash');
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
        
        setIsLoading(true);

        if (paymentMethod === 'Paystack') {
            const customerEmail = selectedCustomer?.email || user.email;
             const itemsForPaystack = cart.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                costPrice: item.costPrice
            }));
            
            const loadingToast = toast({ title: "Initializing Payment...", description: "Please wait.", duration: Infinity });
            
            const paystackResult = await initializePaystackTransaction({
                email: customerEmail,
                total: total,
                customerName: customerName,
                staffId: user.staff_id,
                items: itemsForPaystack,
                runId: run.id,
                customerId: customerId,
                isDebtPayment: false,
                isPosSale: false,
            });

            loadingToast.dismiss();
            
            if (paystackResult.success && paystackResult.reference) {
                // Keep dialog open, let Paystack handle UI
                const PaystackPop = (await import('@paystack/inline-js')).default;
                const paystack = new PaystackPop();
                
                paystack.newTransaction({
                    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
                    email: customerEmail,
                    amount: Math.round(total * 100),
                    ref: paystackResult.reference,
                    onSuccess: async (transaction) => {
                        const verifyResult = await verifyPaystackOnServerAndFinalizeOrder(transaction.reference);
                        if (verifyResult.success && verifyResult.orderId) {
                            toast({ title: 'Payment Successful', description: 'Order has been completed.' });
                            const completedOrder: CompletedOrder = {
                                id: verifyResult.orderId,
                                items: cart,
                                total: total,
                                date: new Date(),
                                paymentMethod: 'Paystack' as const,
                                customerName: customerName,
                                subtotal: 0, tax: 0, status: 'Completed'
                            }
                            onSaleMade(completedOrder);
                            setIsOpen(false);
                        } else {
                            toast({ variant: 'destructive', title: 'Order processing failed', description: verifyResult.error });
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
        
        // For Cash, POS and Credit
        const saleData = {
            runId: run.id,
            items: cart.map(item => ({...item, productId: item.productId || '' })),
            customerId: customerId,
            customerName: customerName,
            paymentMethod,
            staffId: user.staff_id,
            total,
        };

        const result = await handleSellToCustomer(saleData);

        if (result.success && result.orderId) {
            toast({ 
                title: paymentMethod === 'Cash' || paymentMethod === 'POS' ? 'Pending Approval' : 'Success', 
                description: paymentMethod === 'Cash' || paymentMethod === 'POS' ? 'Payment has been submitted for accountant approval.' : 'Credit sale recorded successfully.' 
            });
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" className="w-full" disabled={run.status !== 'active'}>
                    <User className="mr-2 h-5 w-5"/>
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
                            <Select onValueChange={(value) => setPaymentMethod(value as 'Cash' | 'Credit' | 'Paystack' | 'POS')} defaultValue={paymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash"><Wallet className="mr-2 h-4 w-4"/> Cash</SelectItem>
                                    <SelectItem value="POS"><SquareTerminal className="mr-2 h-4 w-4"/> POS</SelectItem>
                                    <SelectItem value="Paystack"><ArrowRightLeft className="mr-2 h-4 w-4"/> Pay with Paystack</SelectItem>
                                    <SelectItem value="Credit" disabled={selectedCustomerId === 'walk-in'}><CreditCard className="mr-2 h-4 w-4"/> Credit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full" disabled={isLoading || cart.length === 0}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Record Sale
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm {paymentMethod} Sale</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will finalize the sale of <strong>{formatCurrency(total)}</strong>. For Cash/POS payments, it will be sent for approval. For Credit/Paystack, it will complete immediately. Are you sure?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSubmit}>Yes, Record Sale</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ReportWasteDialog({ run, user, onWasteReported, remainingItems }: { run: SalesRun, user: User, onWasteReported: () => void, remainingItems: { productId: string; productName: string; price: number; quantity: number }[] }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<{ productId: string, quantity: number | string }[]>([{ productId: '', quantity: 1 }]);
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setItems([{ productId: '', quantity: 1 }]);
            setReason('');
            setNotes('');
        }
    }, [isOpen]);

    const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string) => {
        const newItems = [...items];
        if (field === 'quantity') {
            const numValue = Number(value);
            const productInfo = remainingItems.find(p => p.productId === newItems[index].productId);
            if (productInfo && numValue > productInfo.quantity) {
                toast({ variant: 'destructive', title: 'Error', description: `Cannot report more than ${productInfo.quantity} units of waste for this item.` });
                newItems[index][field] = productInfo.quantity;
            } else {
                newItems[index][field] = value === '' ? '' : numValue;
            }
        } else {
            newItems[index][field] = value;
        }
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { productId: '', quantity: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (items.some(item => !item.productId || !item.quantity || Number(item.quantity) <= 0) || !reason) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all product and reason fields correctly.' });
            return;
        }

        setIsSubmitting(true);
        const dataToSubmit = {
            items: items.map(item => ({ ...item, quantity: Number(item.quantity) })),
            reason,
            notes,
        };

        const result = await handleReportWaste(dataToSubmit, user);

        if (result.success) {
            toast({ title: 'Success', description: 'Waste reported successfully. Your inventory has been updated.' });
            onWasteReported();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(true);
    };

    const getAvailableProductsForRow = (rowIndex: number) => {
        const selectedIdsInOtherRows = new Set(
            items.filter((_, i) => i !== rowIndex).map(item => item.productId)
        );
        return remainingItems.filter(p => !selectedIdsInOtherRows.has(p.productId));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={run.status !== 'active' || remainingItems.length === 0}>
                    <Trash className="mr-2 h-5 w-5"/>
                    <span>Report Waste</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Report Spoiled or Damaged Stock</DialogTitle>
                    <DialogDescription>
                        Select items from this sales run that are no longer sellable. This will deduct them from your personal inventory.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Items to Report</Label>
                        <div className="space-y-2">
                            {items.map((item, index) => {
                                const availableProducts = getAvailableProductsForRow(index);
                                return (
                                    <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                                        <Select value={item.productId} onValueChange={(val) => handleItemChange(index, 'productId', val)}>
                                            <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                                            <SelectContent>
                                                {availableProducts.map((p) => (
                                                    <SelectItem key={p.productId} value={p.productId}>
                                                        {p.productName} (Avail: {p.quantity})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                )
                            })}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="waste-reason">Reason for Waste</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="waste-reason">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Spoiled">Spoiled / Expired</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                            <SelectItem value="Error">Error (Mistake)</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="waste-notes">Additional Notes (Optional)</Label>
                        <Input id="waste-notes" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Submit Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function RecordPaymentDialog({ customer, run, user }: { customer: RunCustomer, run: SalesRun, user: User | null }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState<number | string>('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Paystack'>('Cash');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const outstanding = customer.totalSold - customer.totalPaid;
    
    useEffect(() => {
        const fetchCustomerEmail = async () => {
            if (customer.customerId !== 'walk-in') {
                const customerDoc = await getDoc(doc(db, "customers", customer.customerId));
                if (customerDoc.exists()) {
                    setCustomerEmail(customerDoc.data().email || '');
                }
            }
        }
        if (isOpen) {
            fetchCustomerEmail();
        }
    }, [isOpen, customer.customerId]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setAmount('');
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return;
        }

        if (numValue > outstanding) {
            setAmount(outstanding);
            toast({ variant: 'destructive', title: 'Limit Exceeded', description: `Amount cannot be more than the outstanding balance of ${formatCurrency(outstanding)}` });
        } else {
            setAmount(numValue);
        }
    };


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

        setIsSubmitting(true);
        
        if (paymentMethod === 'Cash') {
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
        } else { // Paystack
            const loadingToast = toast({ title: "Initializing Payment...", duration: Infinity });
            setIsOpen(false); // Close dialog before showing paystack
            const paystackResult = await initializePaystackTransaction({
                email: customerEmail || user.email,
                total: paymentAmount,
                customerName: customer.customerName,
                staffId: user.staff_id,
                isDebtPayment: true,
                runId: run.id,
                customerId: customer.customerId,
                items: [], // No new items for debt payment
                isPosSale: false,
            });
            loadingToast.dismiss();

            if (paystackResult.success && paystackResult.reference) {
                const PaystackPop = (await import('@paystack/inline-js')).default;
                const paystack = new PaystackPop();
                paystack.newTransaction({
                    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
                    email: customerEmail || user.email,
                    amount: Math.round(paymentAmount * 100),
                    ref: paystackResult.reference,
                    onSuccess: async (transaction) => {
                        const verifyResult = await verifyPaystackOnServerAndFinalizeOrder(transaction.reference);
                        if (verifyResult.success) {
                            toast({ title: 'Payment Successful', description: 'Debt has been settled.' });
                        } else {
                            toast({ variant: 'destructive', title: 'Verification Failed', description: verifyResult.error });
                            setIsOpen(true); // Re-open on failure
                        }
                    },
                    onClose: () => {
                        toast({ variant: 'destructive', title: 'Payment Cancelled' });
                        setIsOpen(true); // Re-open on close
                    }
                });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: paystackResult.error });
                setIsOpen(true); // Re-open on init failure
            }
        }
        
        setIsSubmitting(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 {outstanding > 0 && <Button size="sm" variant="outline">Record Payment</Button>}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for {customer.customerName}</DialogTitle>
                    <DialogDescription>
                        Outstanding Amount: <span className="font-bold text-destructive">₦{outstanding.toLocaleString()}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Paystack">Paystack</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {paymentMethod === 'Paystack' && (
                        <div className="space-y-2">
                            <Label htmlFor="customer-email">Customer Email</Label>
                            <Input id="customer-email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="customer@email.com" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="payment-amount">Amount to Pay (₦)</Label>
                        <Input id="payment-amount" type="number" value={amount} onChange={handleAmountChange} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleRecordPayment} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {paymentMethod === 'Cash' ? 'Submit for Approval' : 'Proceed to Paystack'}
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
    const summaryReceiptRef = useRef<HTMLDivElement>(null);
    const [paymentConfirmations, setPaymentConfirmations] = useState<any[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'outstanding', direction: 'desc' });

    useEffect(() => {
      const userJSON = localStorage.getItem('loggedInUser');
      if (userJSON) {
          setUser(JSON.parse(userJSON));
      }
    }, []);

    const fetchRunData = useCallback(async () => {
        if (!runId) return;
        setIsLoading(true);
        const runDetails = await getSalesRunDetails(runId as string);
        setRun(runDetails);
        setIsLoading(false);
    }, [runId]);

    useEffect(() => {
        let unsubRun: (() => void) | undefined;
        let unsubOrders: (() => void) | undefined;
        let unsubPayments: (() => void) | undefined;

        if (runId) {
            // Initial fetch to stop loading state quickly
            getSalesRunDetails(runId as string).then(initialRun => {
                setRun(initialRun);
                if (isLoading) setIsLoading(false);
            });
            
            const runDocRef = doc(db, "transfers", runId as string);
            unsubRun = onSnapshot(runDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    getSalesRunDetails(runId as string).then(setRun);
                } else {
                    setRun(null);
                }
            });

            const ordersQuery = query(collection(db, 'orders'), where('salesRunId', '==', runId as string));
            unsubOrders = onSnapshot(ordersQuery, async () => {
                const [customerDetails, orderDetails] = await Promise.all([
                    getCustomersForRun(runId as string),
                    getOrdersForRun(runId as string)
                ]);
                setCustomers(customerDetails);
                setOrders(orderDetails.map(o => ({...o, date: new Date(o.date)})));
            });

            unsubPayments = onSnapshot(query(collection(db, 'payment_confirmations'), where('runId', '==', runId as string), where('status', '==', 'pending')), (snapshot) => {
                setPaymentConfirmations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
        }
        
        return () => {
            unsubRun?.();
            unsubOrders?.();
            unsubPayments?.();
        };
    }, [runId, isLoading]);
    
    const handleReturnStockAction = async () => {
        if (!run || !user) return;
        const unsold = getRemainingItems();
        const result = await handleReturnStock(run.id, unsold, user);
        if (result.success) {
            toast({ title: 'Success!', description: 'Unsold stock has been sent for acknowledgement.'});
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }

    const handleCompleteRunAction = async () => {
        if (!run) return;
        const result = await handleCompleteRun(run.id);
        if (result.success) {
            toast({ title: 'Success!', description: 'Sales run has been completed and stock reconciled.'});
            router.push('/dashboard/deliveries');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }
    
    const totalCollected = useMemo(() => run?.totalCollected || 0, [run]);
    const runStatus = useMemo(() => run?.status || 'inactive', [run]);

    const sortedCustomers = useMemo(() => {
        const customersWithOutstanding = customers.map(c => ({
            ...c,
            outstanding: c.totalSold - c.totalPaid
        }));

        return [...customersWithOutstanding].sort((a, b) => {
            const { key, direction } = sortConfig;
            if (a[key] < b[key]) {
                return direction === 'asc' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [customers, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' }; // Default to desc for new column
        });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
        }
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };
    
    const handleSaleMade = (newOrder: CompletedOrder) => {
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
    const canPerformSales = user?.staff_id === run?.to_staff_id;
    const allDebtsPaid = run.totalOutstanding <= 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Link href="/dashboard/deliveries" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Deliveries</Link>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchRunData()} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(summaryReceiptRef.current)}>
                        <Printer className={`mr-2 h-4 w-4`} /> Print Run Summary
                    </Button>
                 </div>
            </div>
             <div ref={summaryReceiptRef} className="hidden print:block">
                 <div className="receipt-container p-4">
                    <div className="text-center">
                        <div className="font-bold text-2xl">BMS</div>
                        <div className="text-sm text-muted-foreground">Sales Run Summary</div>
                    </div>
                    <hr className="my-2" />
                     <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Run ID:</span>
                            <span>{run.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Start Time:</span>
                            <span>{run.date ? format(new Date(run.date), 'Pp') : 'N/A'}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Driver:</span>
                            <span>{run.to_staff_name}</span>
                        </div>
                    </div>
                    <hr className="my-2" />
                    <h3 className="font-bold text-center text-sm mb-1">Stock Summary</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead className="h-auto p-1 text-xs">Item</TableHead><TableHead className="text-right h-auto p-1 text-xs">Initial</TableHead><TableHead className="text-right h-auto p-1 text-xs">Sold</TableHead><TableHead className="text-right h-auto p-1 text-xs">Left</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {run.items.map(item => {
                                const sold = item.quantity - (remainingItems.find(i => i.productId === item.productId)?.quantity || 0);
                                return <TableRow key={item.productId}><TableCell className="p-1 text-xs">{item.productName}</TableCell><TableCell className="text-right p-1 text-xs">{item.quantity}</TableCell><TableCell className="text-right p-1 text-xs">{sold}</TableCell><TableCell className="text-right p-1 text-xs">{item.quantity - sold}</TableCell></TableRow>
                            })}
                        </TableBody>
                    </Table>
                    <hr className="my-2" />
                     <h3 className="font-bold text-center text-sm mb-1">Financial Summary</h3>
                     <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Total Value:</span>
                            <span className="font-bold">{formatCurrency(run.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Collected:</span>
                            <span className="font-bold">{formatCurrency(totalCollected)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Outstanding:</span>
                            <span className="font-bold">{formatCurrency(run.totalOutstanding)}</span>
                        </div>
                    </div>
                    <hr className="my-2" />
                     <div className="text-xs text-muted-foreground text-center">Printed on {format(new Date(), 'Pp')}</div>
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
                    <CardContent className="flex-grow space-y-4">
                        <SellToCustomerDialog run={run} user={user} onSaleMade={handleSaleMade} remainingItems={remainingItems}/>
                    </CardContent>
                    {canPerformSales && (
                        <CardFooter className="flex-col gap-2">
                            <ReportWasteDialog run={run} user={user!} onWasteReported={fetchRunData} remainingItems={remainingItems} />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="secondary" className="w-full" disabled={runComplete || remainingItems.length === 0}>
                                        <Undo2 className="mr-2 h-4 w-4"/>Return Unsold Stock
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confirm Stock Return</AlertDialogTitle><AlertDialogDescription>This will create a transfer request for all unsold items to be returned to the storekeeper. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReturnStockAction}>Confirm Return</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={runComplete || !allDebtsPaid || remainingItems.length > 0} className="w-full">
                                        <CheckCircle className="mr-2 h-4 w-4"/> Complete Run
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                     <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will complete the sales run. All stock and finances will be reconciled. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleCompleteRunAction}>Yes, Complete Run</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                     )}
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Stock for this Run</CardTitle>
                    <CardDescription>Initial stock and remaining items for this sales run.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Initial Qty</TableHead>
                                <TableHead className="text-right">Sold</TableHead>
                                <TableHead className="text-right">Remaining</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {run.items.map(item => {
                                const soldQuantity = orders.flatMap(o => o.items).filter(i => i.productId === item.productId).reduce((sum, i) => sum + i.quantity, 0);
                                const remaining = item.quantity - soldQuantity;
                                return (
                                    <TableRow key={item.productId}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{soldQuantity}</TableCell>
                                        <TableCell className="text-right font-bold">{remaining}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
                            <CardDescription>All customers in this run. Click headers to sort.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('totalSold')}>
                                            <div className="flex items-center justify-end">Total Sold {getSortIcon('totalSold')}</div>
                                        </TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('totalPaid')}>
                                            <div className="flex items-center justify-end">Total Paid {getSortIcon('totalPaid')}</div>
                                        </TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('outstanding')}>
                                            <div className="flex items-center justify-end">Outstanding {getSortIcon('outstanding')}</div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedCustomers.map(customer => {
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
                                                    {(canPerformSales && !runComplete) ? (
                                                        <RecordPaymentDialog customer={customer} run={run} user={user} />
                                                    ) : (
                                                        <Button size="sm" variant="outline" disabled>Record Payment</Button>
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
                                            <TableCell>{format(new Date(order.date), 'Pp')}</TableCell>
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

            <Dialog open={!!viewingOrder} onOpenChange={(isOpen) => !isOpen && setViewingOrder(null)}>
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
        </div>
    );
}

export default SalesRunDetails;
