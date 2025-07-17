
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
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { handleInitiateTransfer } from "@/app/actions";
import { Badge } from "@/components/ui/badge";

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

type Transfer = {
    id: string;
    to_staff_id: string;
    to_staff_name: string;
    items: TransferItem[];
    date: Timestamp;
    status: 'pending' | 'completed' | 'cancelled';
}

export default function StockControlPage() {
  const { toast } = useToast();
  const [transferTo, setTransferTo] = useState("");
  const [isSalesRun, setIsSalesRun] = useState(false);
  const [isSalesRunDisabled, setIsSalesRunDisabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Partial<TransferItem>[]>([
    { productId: "", quantity: 1 },
  ]);
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [initiatedTransfers, setInitiatedTransfers] = useState<Transfer[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const staffQuery = query(collection(db, "staff"), where("role", "in", ["Showroom Staff", "Delivery Staff", "Manager"]));
            const staffSnapshot = await getDocs(staffQuery);
            setStaff(staffSnapshot.docs.map(doc => ({ staff_id: doc.id, name: doc.data().name, role: doc.data().role })));

            const productsSnapshot = await getDocs(collection(db, "products"));
            setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, stock: doc.data().stock })));

            const transfersQuery = query(collection(db, "transfers"), orderBy("date", "desc"));
            const transfersSnapshot = await getDocs(transfersQuery);
            setInitiatedTransfers(transfersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer)));

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load necessary data." });
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [toast]);

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
    if (!transferTo || items.some(i => !i.productId || !i.quantity)) {
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

    const result = await handleInitiateTransfer(transferData);

    if (result.success) {
        toast({ title: "Success", description: "Transfer initiated successfully." });
        // Reset form
        setTransferTo("");
        setIsSalesRun(false);
        setNotes("");
        setItems([{ productId: "", quantity: 1 }]);
        // Refetch transfers and products (for stock update)
        const transfersQuery = query(collection(db, "transfers"), orderBy("date", "desc"));
        const transfersSnapshot = await getDocs(transfersQuery);
        setInitiatedTransfers(transfersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer)));

        const productsSnapshot = await getDocs(collection(db, "products"));
        setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, stock: doc.data().stock })));

    } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold font-headline">Stock Control</h1>
      </div>
      <Tabs defaultValue="initiate-transfer">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="initiate-transfer">
            <Send className="mr-2 h-4 w-4" /> Initiate Transfer
          </TabsTrigger>
          <TabsTrigger value="prod-requests">
            <Wrench className="mr-2 h-4 w-4" /> Prod Requests
          </TabsTrigger>
          <TabsTrigger value="production-transfers">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Production Transfers
          </TabsTrigger>
          <TabsTrigger value="report-waste">
            <Trash className="mr-2 h-4 w-4" /> Report Waste
          </TabsTrigger>
          <TabsTrigger value="pending-transfers" className="relative">
            <Hourglass className="mr-2 h-4 w-4" /> Pending Transfers
            {initiatedTransfers.filter(t => t.status === 'pending').length > 0 && (
                 <div className="absolute top-1 right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {initiatedTransfers.filter(t => t.status === 'pending').length}
                </div>
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
      </Tabs>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>My Initiated Transfers</CardTitle>
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
                        <TableHead>To</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                <Loader2 className="h-8 w-8 animate-spin"/>
                            </TableCell>
                        </TableRow>
                    ) : initiatedTransfers.length > 0 ? (
                        initiatedTransfers.map((transfer) => (
                             <TableRow key={transfer.id}>
                                <TableCell>{transfer.date ? format(transfer.date.toDate(), 'PPpp') : 'N/A'}</TableCell>
                                <TableCell>{transfer.to_staff_name}</TableCell>
                                <TableCell>{transfer.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                                <TableCell><Badge variant="secondary">{transfer.status}</Badge></TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">No transfers initiated yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
