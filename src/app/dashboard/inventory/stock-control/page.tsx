

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  PlusCircle,
  Trash2,
  Calendar as CalendarIcon,
  Package,
  ArrowRightLeft,
  Wrench,
  Trash,
  Hourglass,
  Loader2,
  Check,
  X,
  Truck,
  Eye,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where, orderBy, Timestamp, getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { handleInitiateTransfer, handleReportWaste, getPendingTransfersForStaff, handleAcknowledgeTransfer, Transfer, getCompletedTransfersForStaff, WasteLog, getWasteLogsForStaff, getProductionTransfers, ProductionBatch } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogHeader, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";

type User = {
    name: string;
    role: string;
    staff_id: string;
};

type TransferItem = {
  productId: string;
  productName: string;
  quantity: number;
};

type StaffMember = {
  staff_id: string;
  name: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

type Ingredient = {
    id: string;
    name: string;
    unit: string;
    stock: number;
};

function AcceptRunDialog({ transfer, onAccept }: { transfer: Transfer, onAccept: (id: string, action: 'accept' | 'decline') => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = (action: 'accept' | 'decline') => {
        setIsSubmitting(true);
        onAccept(transfer.id, action);
        // The dialog will close on its own if the parent component rerenders and this dialog is no longer there
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm">View & Acknowledge</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Acknowledge Transfer: {transfer.id.substring(0, 6).toUpperCase()}</DialogTitle>
                    <DialogDescription>
                        You are about to accept responsibility for the following items. This action cannot be undone.
                    </DialogDescription>
                    <DialogClose />
                </DialogHeader>
                <div className="py-4 max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.items.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-right">₦{((item.price || 0) * item.quantity).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="font-bold text-lg flex justify-between border-t pt-4">
                    <span>Total Run Value:</span>
                    <span>₦{(transfer.totalValue || 0).toLocaleString()}</span>
                </div>
                <DialogFooter className="mt-4">
                     <Button variant="destructive" onClick={() => handleAction('decline')} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Decline
                    </Button>
                     <Button onClick={() => handleAction('accept')} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Accept
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ReportWasteTab({ products, user, onWasteReported }: { products: Product[], user: User | null, onWasteReported: () => void }) {
    const { toast } = useToast();
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedProduct = useMemo(() => products.find(p => p.id === productId), [productId, products]);

    const handleSubmit = async () => {
        if (!productId || !quantity || !reason || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.' });
            return;
        }

        if (selectedProduct && Number(quantity) > selectedProduct.stock) {
            toast({ variant: 'destructive', title: 'Error', description: `Cannot report more waste than available stock (${selectedProduct.stock}).` });
            return;
        }

        setIsSubmitting(true);
        const result = await handleReportWaste({
            productId,
            productName: selectedProduct?.name || 'Unknown Product',
            productCategory: 'Unknown', // This should be ideally fetched with product data
            quantity: Number(quantity),
            reason,
            notes
        }, user);

        if (result.success) {
            toast({ title: 'Success', description: 'Waste reported successfully. Inventory has been updated.' });
            setProductId("");
            setQuantity(1);
            setReason("");
            setNotes("");
            onWasteReported(); // Callback to refresh product list
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trash /> Report Spoiled or Damaged Stock</CardTitle>
                <CardDescription>
                    Use this form to report any items that are no longer sellable from your personal stock. This will deduct the items from your inventory.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="waste-product">Product</Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger id="waste-product">
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name} (Stock: {p.stock})
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="waste-quantity">Quantity Wasted</Label>
                        <Input id="waste-quantity" type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
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
                           <SelectItem value="Burnt">Burnt (Production)</SelectItem>
                           <SelectItem value="Error">Error (Mistake)</SelectItem>
                           <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="waste-notes">Additional Notes (Optional)</Label>
                    <Textarea id="waste-notes" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Submit Report
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function StockControlPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [isSalesRun, setIsSalesRun] = useState(false);
  const [isSalesRunDisabled, setIsSalesRunDisabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Partial<TransferItem>[]>([
    { productId: "", quantity: 1 },
  ]);
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [initiatedTransfers, setInitiatedTransfers] = useState<Transfer[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
  const [productionTransfers, setProductionTransfers] = useState<Transfer[]>([]);
  const [pendingBatches, setPendingBatches] = useState<ProductionBatch[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<Transfer[]>([]);
  const [myWasteLogs, setMyWasteLogs] = useState<WasteLog[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fetchPageData = async () => {
        const userStr = localStorage.getItem('loggedInUser');
        if (!userStr) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user.' });
            setIsLoading(false);
            return;
        }
        const currentUser = JSON.parse(userStr);
        setUser(currentUser);

        try {
            // Fetch all staff for the transfer dropdown
            const staffQuery = query(collection(db, "staff"), where("role", "in", ["Showroom Staff", "Delivery Staff"]));
            const staffSnapshot = await getDocs(staffQuery);
            setStaff(staffSnapshot.docs.map(doc => ({ staff_id: doc.id, name: doc.data().name, role: doc.data().role })));

            // Fetch products based on user role
            const userRole = currentUser.role;
            if (userRole === 'Manager' || userRole === 'Supervisor' || userRole === 'Storekeeper') {
                // Admins see main inventory for transfers and waste reporting
                const productsSnapshot = await getDocs(collection(db, "products"));
                setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, stock: doc.data().stock })));
                const ingredientsSnapshot = await getDocs(collection(db, "ingredients"));
                setIngredients(ingredientsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, unit: doc.data().unit, stock: doc.data().stock })));
                 // Fetch transfers initiated by the user for the log
                const transfersQuery = query(collection(db, "transfers"), where('from_staff_id', '==', currentUser.staff_id), orderBy("date", "desc"));
                const transfersSnapshot = await getDocs(transfersQuery);
                setInitiatedTransfers(transfersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate().toISOString() } as Transfer)));
            } else {
                // Other staff see their personal stock for waste reporting
                const personalStockQuery = collection(db, 'staff', currentUser.staff_id, 'personal_stock');
                const personalStockSnapshot = await getDocs(personalStockQuery);
                setProducts(personalStockSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().productName, stock: doc.data().stock })));
            }
            
            // Fetch data specific to the logged-in user
            const [pendingData, completedData, wasteData, prodTransfers] = await Promise.all([
                getPendingTransfersForStaff(currentUser.staff_id),
                getCompletedTransfersForStaff(currentUser.staff_id),
                getWasteLogsForStaff(currentUser.staff_id),
                getProductionTransfers()
            ]);
            setPendingTransfers(pendingData);
            setCompletedTransfers(completedData);
            setMyWasteLogs(wasteData);
            setProductionTransfers(prodTransfers);


        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load necessary data." });
        } finally {
            setIsLoading(false);
        }
    };

  useEffect(() => {
    setIsLoading(true);
    fetchPageData();

    // Real-time listener for pending batches (for storekeeper)
    setIsLoadingBatches(true);
    const qPending = query(collection(db, 'production_batches'), where('status', '==', 'pending_approval'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
        setPendingBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toISOString() } as ProductionBatch)));
        setIsLoadingBatches(false);
    });

    return () => unsubPending();
  }, []);

  const handleTransferToChange = (staffId: string) => {
    setTransferTo(staffId);
    const selectedStaff = staff.find(s => s.staff_id === staffId);
    if (selectedStaff) {
        if (selectedStaff.role === 'Delivery Staff') {
            setIsSalesRun(true);
            setIsSalesRunDisabled(true);
        } else if (selectedStaff.role === 'Showroom Staff') {
            setIsSalesRun(false);
            setIsSalesRunDisabled(true);
        } else {
            setIsSalesRun(false);
            setIsSalesRunDisabled(false);
        }
    }
  }


  const handleItemChange = (
    index: number,
    field: keyof TransferItem,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "productId") {
      const product = products.find(p => p.id === value);
      item.productId = value as string;
      item.productName = product?.name;
    } else {
        const product = products.find(p => p.id === item.productId);
        const newQuantity = Number(value);
        if (product && newQuantity > product.stock) {
            toast({
                variant: "destructive",
                title: "Stock Exceeded",
                description: `Cannot transfer more than ${product.stock} units of ${product.name}.`
            });
            item.quantity = product.stock;
        } else {
            item.quantity = newQuantity;
        }
    }
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!transferTo || items.some(i => !i.productId || !i.quantity) || !user) {
        toast({ variant: "destructive", title: "Error", description: "Please select a staff member and fill all item fields."});
        return;
    }

    // Final validation before submitting
    for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product || item.quantity! > product.stock) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: `Stock for ${item.productName} is insufficient. Maximum: ${product?.stock}.`
            });
            return;
        }
    }

    setIsSubmitting(true);
    const staffMember = staff.find(s => s.staff_id === transferTo);
    
    const transferData = {
        to_staff_id: transferTo,
        to_staff_name: staffMember?.name || 'Unknown',
        is_sales_run: isSalesRun,
        notes: notes,
        items: items as TransferItem[],
    }

    const result = await handleInitiateTransfer(transferData, user);

    if (result.success) {
        toast({ title: "Success", description: "Transfer initiated successfully." });
        setTransferTo("");
        setIsSalesRun(false);
        setNotes("");
        setItems([{ productId: "", quantity: 1 }]);
        fetchPageData(); // Refetch all data

    } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
    }

    setIsSubmitting(false);
  };
  
  const handleAcknowledge = async (id: string, type: 'accept' | 'decline') => {
    const result = await handleAcknowledgeTransfer(id, type);
    if (result.success) {
        const message = type === 'accept' ? 'Transfer accepted.' : 'Transfer has been declined.';
        toast({ title: 'Success', description: message });
        fetchPageData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  const userRole = user?.role;
  const canInitiateTransfer = userRole === 'Manager' || userRole === 'Supervisor' || userRole === 'Storekeeper';
  
  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // Simplified view for sales and delivery staff
  if (!canInitiateTransfer) {
     return (
         <div className="flex flex-col gap-6">
             <h1 className="text-2xl font-bold font-headline">Stock Control</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package />
                        Acknowledge Incoming Stock
                        {pendingTransfers.length > 0 && <Badge variant="destructive">{pendingTransfers.length}</Badge>}
                    </CardTitle>
                    <CardDescription>Review and acknowledge stock transferred to you. Accepted Sales Runs will appear in your "Deliveries" tab.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : pendingTransfers.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No pending transfers.</TableCell></TableRow>
                            ) : (
                                pendingTransfers.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{format(new Date(t.date), 'Pp')}</TableCell>
                                        <TableCell>{t.from_staff_name}</TableCell>
                                        <TableCell>
                                            {t.is_sales_run ? <Badge variant="secondary"><Truck className="h-3 w-3 mr-1" />Sales Run</Badge> : <Badge variant="outline"><Package className="h-3 w-3 mr-1"/>Stock</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            {t.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AcceptRunDialog transfer={t} onAccept={handleAcknowledge} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> My Transfer History</CardTitle>
                    <CardDescription>A log of all stock transfers you have successfully accepted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                        ) : completedTransfers.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">You have no completed transfers.</TableCell></TableRow>
                        ) : (
                            completedTransfers.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>{format(new Date(t.date), 'Pp')}</TableCell>
                                    <TableCell>{t.from_staff_name}</TableCell>
                                    <TableCell>
                                        {t.is_sales_run ? <Badge variant="secondary"><Truck className="h-3 w-3 mr-1" />Sales Run</Badge> : <Badge variant="outline"><Package className="h-3 w-3 mr-1"/>Stock</Badge>}
                                    </TableCell>
                                    <TableCell><Badge>{t.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {t.is_sales_run && t.status === 'completed' && (
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/dashboard/sales-runs/${t.id}`}><Eye className="mr-2 h-4 w-4"/>View Details</Link>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {userRole !== 'Baker' && (
                <ReportWasteTab products={products} user={user} onWasteReported={fetchPageData} />
            )}
         </div>
     )
  }

  // Full view for admins
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold font-headline">Stock Control</h1>
      </div>
      <Tabs defaultValue="initiate-transfer">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="initiate-transfer">
              <Send className="mr-2 h-4 w-4" /> Initiate Transfer
          </TabsTrigger>
          <TabsTrigger value="prod-requests" className="relative">
            <Wrench className="mr-2 h-4 w-4" /> Batch Approvals
             {pendingBatches.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                    {pendingBatches.length}
                </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="production-transfers" className="relative">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Production Transfers
             {productionTransfers.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                    {productionTransfers.length}
                </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending-transfers" className="relative">
            <Hourglass className="mr-2 h-4 w-4" /> All Pending
             {initiatedTransfers.filter(t => t.status === 'pending').length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                    {initiatedTransfers.filter(t => t.status === 'pending').length}
                </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="initiate-transfer">
        <Card>
            <CardHeader>
            <CardTitle>Transfer Stock to Sales Floor</CardTitle>
            <CardDescription>
                Initiate a transfer of finished products from the main store to a
                sales staff member.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="transfer-to">Transfer to</Label>
                    <Select value={transferTo} onValueChange={handleTransferToChange} disabled={isLoading}>
                    <SelectTrigger id="transfer-to">
                        <SelectValue placeholder="Select a staff member" />
                    </SelectTrigger>
                    <SelectContent>
                        {staff.map((s) => (
                        <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name} ({s.role})
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="sales-run" checked={isSalesRun} onCheckedChange={(checked) => setIsSalesRun(checked as boolean)} disabled={isSalesRunDisabled}/>
                        <div className="grid gap-1.5 leading-none">
                            <label
                            htmlFor="sales-run"
                            className={cn("text-sm font-medium leading-none", isSalesRunDisabled ? "text-muted-foreground" : "peer-disabled:cursor-not-allowed peer-disabled:opacity-70")}
                            >
                            This is for a sales run
                            </label>
                            <p className="text-sm text-muted-foreground">
                            The recipient will manage sales for these items.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Items to Transfer</Label>
                <div className="space-y-2">
                {items.map((item, index) => (
                    <div
                    key={index}
                    className="grid grid-cols-[1fr_120px_auto] gap-2 items-center"
                    >
                    <Select
                        value={item.productId}
                        onValueChange={(value) =>
                        handleItemChange(index, "productId", value)
                        }
                        disabled={isLoading}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                        {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                        }
                    />
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </div>
                ))}
                </div>
                <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleAddItem}
                >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Submit Transfer
                </Button>
            </div>
            </CardContent>
        </Card>
        </TabsContent>
         <TabsContent value="prod-requests">
             <Card>
                <CardHeader>
                    <CardTitle>Pending Batch Approvals</CardTitle>
                    <CardDescription>Batches requested by bakers that need ingredient approval from the storekeeper.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Requested By</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoadingBatches ? (
                                 <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : pendingBatches.length > 0 ? pendingBatches.map(batch => (
                                <TableRow key={batch.id}>
                                    <TableCell>{format(new Date(batch.createdAt), 'PPP')}</TableCell>
                                    <TableCell>{batch.productName}</TableCell>
                                    <TableCell>{batch.quantityToProduce}</TableCell>
                                    <TableCell>{batch.requestedByName}</TableCell>
                                    <TableCell>Implement Dialog Here</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No batches are pending approval.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="production-transfers">
              <Card>
                <CardHeader>
                    <CardTitle>Production Transfers</CardTitle>
                    <CardDescription>Acknowledge finished goods transferred from the production unit to the main store.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : productionTransfers.length > 0 ? (
                                productionTransfers.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{format(new Date(t.date), 'Pp')}</TableCell>
                                        <TableCell>{t.from_staff_name}</TableCell>
                                        <TableCell>{t.items[0]?.productName}</TableCell>
                                        <TableCell>{t.items[0]?.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleAcknowledge(t.id, 'accept')}>
                                                <Check className="mr-2 h-4 w-4" /> Accept
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No pending transfers from production.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="pending-transfers">
              <Card>
                <CardHeader>
                    <CardTitle>All Pending Transfers</CardTitle>
                    <CardDescription>A log of all transfers awaiting acknowledgement across the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : (
                                initiatedTransfers.filter(t => t.status === 'pending').map(transfer => (
                                    <TableRow key={transfer.id}>
                                        <TableCell>{transfer.date ? format(new Date(transfer.date), 'PPpp') : 'N/A'}</TableCell>
                                        <TableCell>{transfer.from_staff_name}</TableCell>
                                        <TableCell>{transfer.to_staff_name}</TableCell>
                                        <TableCell>{transfer.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                                        <TableCell><Badge variant="secondary">{transfer.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            )}
                             { !isLoading && initiatedTransfers.filter(t => t.status === 'pending').length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No pending transfers found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
          </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>My Initiated Transfers Log</CardTitle>
                    <CardDescription>A log of transfers you have initiated.</CardDescription>
                </div>
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
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                <Loader2 className="h-8 w-8 animate-spin"/>
                            </TableCell>
                        </TableRow>
                    ) : initiatedTransfers.length > 0 ? (
                        initiatedTransfers.map((transfer) => (
                             <TableRow key={transfer.id}>
                                <TableCell>{transfer.date ? format(new Date(transfer.date), 'PPpp') : 'N/A'}</TableCell>
                                <TableCell>{transfer.from_staff_name}</TableCell>
                                <TableCell>{transfer.to_staff_name}</TableCell>
                                <TableCell>{transfer.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                                <TableCell><Badge variant={transfer.status === 'pending' ? 'secondary' : transfer.status === 'completed' || transfer.status === 'active' ? 'default' : 'destructive'}>{transfer.status}</Badge></TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">No stock movements recorded yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
