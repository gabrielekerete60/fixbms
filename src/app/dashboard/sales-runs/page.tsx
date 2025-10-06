
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSalesRunDetails, SalesRun, getCustomersForRun, handleSellToCustomer, handleRecordDebtPaymentForRun, getOrdersForRun, handleCompleteRun, handleReturnStock, handleReportWaste, logRunExpense, getProductsForStaff, getStaffList, getProducts } from '@/app/actions';
import { Loader2, ArrowLeft, User, Package, HandCoins, PlusCircle, Trash2, CreditCard, Wallet, Plus, Minus, Printer, ArrowRightLeft, ArrowUpDown, RefreshCw, Undo2, CheckCircle, Trash, SquareTerminal, FileSignature, Car, Fuel, Receipt as ReceiptIcon, Building, Edit } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select as ShadSelect, SelectContent as ShadSelectContent, SelectItem as ShadSelectItem, SelectTrigger as ShadSelectTrigger, SelectValue as ShadSelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { collection, doc, Timestamp, onSnapshot, query, where, addDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { format } from "date-fns";
import { Textarea } from '@/components/ui/textarea';
import Select from 'react-select';
import { ProductEditDialog } from '@/app/dashboard/components/product-edit-dialog';


type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type OrderItem = { productId: string; quantity: number, price: number, name: string, costPrice?: number, minPrice?: number, maxPrice?: number };

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

type StaffMember = {
  id: string;
  name: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  "data-ai-hint": string;
  costPrice?: number;
  lowStockThreshold?: number;
  minPrice?: number;
  maxPrice?: number;
};

type SortKey = 'customerName' | 'totalSold' | 'totalPaid' | 'outstanding';
type SortDirection = 'asc' | 'desc';

type Expense = {
  id?: string;
  category: string;
  description: string;
  amount: number;
  date?: string | Date;
  runId?: string;
  driverId?: string;
  driverName?: string;
  status?: 'pending' | 'approved' | 'declined';
}

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

// The rest of your client component code from client.tsx will go here...
// I'll combine the content of client.tsx into this page.tsx
function SalesRunDetailsPageClientContent() {
    const searchParams = useSearchParams();
    const runId = searchParams.get('runId');
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
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

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
        
        const userJSON = localStorage.getItem('loggedInUser');
        if (userJSON) {
            setUser(JSON.parse(userJSON));
        }
        getProducts().then(setAllProducts);

        if (runId) {
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
        } else {
             setIsLoading(false);
        }
        
        return () => {
            unsubRun?.();
            unsubOrders?.();
            unsubPayments?.();
        };
    }, [runId, isLoading]);

    if (!runId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <h1 className="text-2xl font-bold">No Sales Run Selected</h1>
                <p className="text-muted-foreground">Please select a sales run from the deliveries page.</p>
            </div>
        );
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
            return { key, direction: 'desc' };
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
                name: item.productName,
                quantity: remainingQuantity > 0 ? remainingQuantity : 0,
            };
        }).filter(item => item.quantity > 0);
    }, [run, orders]);
    
    const { progressValue, progressDenominator } = useMemo(() => {
        if (!run) return { progressValue: 0, progressDenominator: 1 };
        
        if (run.status === 'pending_return' || run.status === 'return_completed') {
            const totalSoldValue = orders.reduce((sum, order) => sum + order.total, 0);
            return {
                progressValue: totalCollected,
                progressDenominator: totalSoldValue > 0 ? totalSoldValue : 1,
            };
        }
        
        return {
            progressValue: totalCollected,
            progressDenominator: run.totalRevenue || 1
        };

    }, [run, orders, totalCollected]);


    const remainingItems = useMemo(getRemainingItems, [getRemainingItems]);
    const productCategories = useMemo(() => ['All', ...new Set(allProducts.map(p => p.category))], [allProducts]);
    
    if (isLoading || !run || !user) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const runComplete = runStatus === 'completed' || run.status === 'return_completed';
    const isPendingReturn = runStatus === 'pending_return';
    const canPerformActions = user?.staff_id === run?.to_staff_id;
    const canPerformSales = canPerformActions && !runComplete && !isPendingReturn;
    const canReturnStock = canPerformActions && (run.status === 'active' || isPendingReturn);
    const isReadOnly = user?.role === 'Manager';
    const allDebtsPaid = run.totalOutstanding <= 0;
    
    return (
        <div className="flex flex-col gap-6">
             <ProductEditDialog 
                product={editingProduct}
                onOpenChange={() => setEditingProduct(null)}
                onProductUpdate={fetchRunData}
                user={user}
                categories={productCategories}
             />
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

            <h1 className="text-2xl font-bold font-headline">Sales Run: {runId.substring(0,8)}...</h1>
             {runComplete && <Badge variant="outline">Completed</Badge>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Run Summary</CardTitle>
                        <CardDescription>Overview of this sales run.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between"><span>Status:</span> <Badge>{runStatus}</Badge></div>
                        <div className="flex justify-between"><span>Start Time:</span> <span>{run.date ? format(new Date(run.date), 'PPP') : 'N/A'}</span></div>
                         <div className="flex justify-between"><span>Driver:</span> <span>{run.to_staff_name}</span></div>
                        <div><Progress value={(progressValue / progressDenominator) * 100} /></div>
                        <div className="text-sm text-muted-foreground">Collection Progress ({formatCurrency(progressValue)} / {formatCurrency(progressDenominator)})</div>
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
                    <CardContent className="flex-grow grid grid-cols-2 gap-2">
                        <SellToCustomerDialog run={run} user={user} onSaleMade={handleSaleMade} remainingItems={remainingItems}/>
                        <RecordPaymentDialog customer={null} run={run} user={user} />
                        <LogCustomSaleDialog run={run} user={user} onSaleMade={handleSaleMade} remainingItems={remainingItems} />
                        <LogExpenseDialog run={run} user={user} />
                        <ReportWasteDialog run={run} user={user} onWasteReported={fetchRunData} remainingItems={remainingItems} />
                        {canReturnStock && <ReturnStockDialog user={user} onReturn={fetchRunData} remainingItems={remainingItems} />}
                    </CardContent>
                    {canPerformActions && (
                        <CardFooter className="flex-col gap-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={runComplete || !allDebtsPaid || remainingItems.length > 0} className="w-full">
                                        <CheckCircle className="mr-2 h-4 w-4"/> Complete Run
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                     <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will complete the sales run. All stock and finances will be reconciled. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader
                                    ><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleCompleteRunAction}>Yes, Complete Run</AlertDialogAction></AlertDialogFooter>
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
                                {user?.role === 'Developer' && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {run.items.map(item => {
                                const soldQuantity = orders.flatMap(o => o.items).filter(i => i.productId === item.productId).reduce((sum, i) => sum + i.quantity, 0);
                                const remaining = item.quantity - soldQuantity;
                                const fullProduct = allProducts.find(p => p.id === item.productId);
                                return (
                                    <TableRow key={item.productId}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{soldQuantity}</TableCell>
                                        <TableCell className="text-right font-bold">{remaining}</TableCell>
                                        {user?.role === 'Developer' && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingProduct(fullProduct!)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
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
                     <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
                            <div className="md:hidden space-y-4">
                                {sortedCustomers.map(customer => {
                                    const outstanding = customer.totalSold - customer.totalPaid;
                                    return (
                                        <Card key={customer.customerId} className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold">{customer.customerName}</p>
                                                <Button variant="ghost" size="sm" onClick={() => setViewingCustomer(customer)}>View Orders</Button>
                                            </div>
                                            <div className="text-sm pt-2 border-t space-y-1">
                                                <div className="flex justify-between"><span>Sold:</span><span>{formatCurrency(customer.totalSold)}</span></div>
                                                <div className="flex justify-between"><span>Paid:</span><span className="text-green-500">{formatCurrency(customer.totalPaid)}</span></div>
                                                <div className="flex justify-between font-bold"><span>Owed:</span><span className="text-destructive">{formatCurrency(outstanding)}</span></div>
                                            </div>
                                             {canPerformActions && !runComplete && outstanding > 0 && (
                                                <div className="pt-2 border-t">
                                                    <RecordPaymentDialog customer={customer} run={run} user={user} />
                                                </div>
                                            )}
                                        </Card>
                                    )
                                })}
                            </div>
                            <div className="hidden md:block">
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
                                                        {(canPerformActions && !runComplete && outstanding > 0) ? (
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
                            </div>
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
                             <div className="md:hidden space-y-4">
                                {orders.map(order => (
                                     <Card key={order.id} className="p-4 space-y-2" onClick={() => setViewingOrder(order)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{order.customerName}</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(order.date), 'Pp')}</p>
                                            </div>
                                            <Badge variant="secondary">{order.paymentMethod}</Badge>
                                        </div>
                                         <div className="text-sm pt-2 border-t flex justify-between">
                                            <span>{order.items.reduce((sum, i) => sum + i.quantity, 0)} items</span>
                                            <span className="font-bold">{formatCurrency(order.total)}</span>
                                        </div>
                                     </Card>
                                ))}
                            </div>
                            <div className="hidden md:block">
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
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="expenses">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>Run Expenses</CardTitle>
                                <CardDescription>Log and view expenses specific to this sales run.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                 <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No expenses logged for this run yet.
                                        </TableCell>
                                    </TableRow>
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

export default function SalesRunPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <SalesRunDetailsPageClientContent />
        </Suspense>
    )
}

    