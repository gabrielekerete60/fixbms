
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Printer, FileDown, MoreHorizontal, Calendar as CalendarIcon, ListFilter, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useReactToPrint } from 'react-to-print';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CompletedOrder = {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: Timestamp;
  paymentMethod: 'Card' | 'Cash';
  customerName?: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

const Receipt = React.forwardRef<HTMLDivElement, { order: CompletedOrder }>(({ order }, ref) => {
  return (
    <div ref={ref} className="print:p-8">
      <div id={`receipt-${order.id}`}>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-center">BMS</DialogTitle>
          <DialogDescription className="text-center">
              Sale Receipt
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground">
                <p><strong>Order ID:</strong> {order.id}</p>
                <p><strong>Date:</strong> {order.date.toDate().toLocaleString()}</p>
                <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                <p><strong>Customer:</strong> {order.customerName || 'Walk-in'}</p>
            </div>
            <Separator />
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">₦{(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
                <Separator />
                <div className="w-full space-y-1 text-sm pr-2">
                <div className="flex justify-between font-bold text-base mt-1">
                    <span>Total</span>
                    <span>₦{order.total.toFixed(2)}</span>
                </div>
            </div>
            <Separator />
            <p className="text-center text-xs text-muted-foreground">Thank you for your patronage!</p>
        </div>
      </div>
    </div>
  );
});
Receipt.displayName = 'Receipt';


const getStatusVariant = (status?: string) => {
    if (!status) return 'outline';
    switch (status.toLowerCase()) {
        case 'completed':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'cancelled':
            return 'destructive';
        default:
            return 'outline';
    }
}

function OrdersTable({ orders, onSelectOne, onSelectAll, selectedOrders, allOrdersSelected }: { orders: CompletedOrder[], onSelectOne: (id: string, checked: boolean) => void, onSelectAll: (checked: boolean) => void, selectedOrders: string[], allOrdersSelected: boolean }) {
    const [viewingOrder, setViewingOrder] = useState<CompletedOrder | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
        content: () => receiptRef.current,
        documentTitle: `Receipt-${viewingOrder?.id}`,
    });
    
    return (
        <>
        <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
            <DialogContent className="sm:max-w-md">
                {viewingOrder && <Receipt order={viewingOrder} ref={receiptRef} />}
                 <DialogFooter className="flex justify-end gap-2 print:hidden">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableCell>
                       <Checkbox
                            checked={allOrdersSelected}
                            onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                            aria-label="Select all"
                        />
                    </TableCell>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                            No orders found for this view.
                        </TableCell>
                    </TableRow>
                ) : (
                    orders.map((order) => (
                        <TableRow key={order.id} data-state={selectedOrders.includes(order.id) ? "selected" : undefined}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedOrders.includes(order.id)}
                                    onCheckedChange={(checked) => onSelectOne(order.id, checked as boolean)}
                                    aria-label={`Select order ${order.id}`}
                                />
                            </TableCell>
                            <TableCell className="font-medium">{order.id.substring(0, 7)}...</TableCell>
                            <TableCell>{order.date.toDate().toLocaleDateString()}</TableCell>
                            <TableCell>{order.customerName || 'Walk-in'}</TableCell>
                            <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                            <TableCell>
                                <Badge variant={'secondary'}>
                                    {order.paymentMethod}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(order.status)}>
                                    {order.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">₦{order.total.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => setViewingOrder(order)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            <span>View Details</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
        </>
    );
}


function ExportDialog({ children, onExport }: { children: React.ReactNode, onExport: (options: { dateRange?: DateRange, status: string }) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>();
  const [status, setStatus] = useState("all");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Orders</DialogTitle>
          <DialogDescription>
            Select a date range and status to export a filtered list of orders to a CSV file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
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
                        <span>Filter by date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
            <div className="grid gap-2">
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={() => { onExport({ dateRange: date, status }); setIsOpen(false); }}>Export to CSV</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function RegularOrdersPage() {
  const { toast } = useToast();
  const [allOrders, setAllOrders] = useState<CompletedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  const selectedOrdersRef = useRef<HTMLDivElement>(null);

  const handlePrintSelected = useReactToPrint({
      content: () => selectedOrdersRef.current,
      documentTitle: 'Selected-Orders',
  });


  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const ordersQuery = query(collection(db, "orders"), orderBy("date", "desc"));
        const orderSnapshot = await getDocs(ordersQuery);
        const ordersList = orderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CompletedOrder[];
        setAllOrders(ordersList);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch orders from the database.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [toast]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      const orderDate = order.date.toDate();
      const dateMatch = !date?.from || (orderDate >= date.from && (!date.to || orderDate <= date.to));
      const searchMatch = !searchTerm || order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      const paymentMatch = paymentMethodFilter === 'all' || order.paymentMethod === paymentMethodFilter;
      return dateMatch && searchMatch && paymentMatch;
    });
  }, [allOrders, date, searchTerm, paymentMethodFilter]);

  const handleSelectOne = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => {
        if (checked) {
            return [...prev, orderId];
        } else {
            return prev.filter(id => id !== orderId);
        }
    });
  }
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  }

  const handleExport = (options: { dateRange?: DateRange, status: string }) => {
    let ordersToExport = allOrders;
    
    if (options.dateRange?.from) {
        ordersToExport = ordersToExport.filter(order => {
            const orderDate = order.date.toDate();
            return orderDate >= options.dateRange!.from! && (!options.dateRange!.to || orderDate <= options.dateRange!.to!);
        });
    }

    if (options.status !== 'all') {
        ordersToExport = ordersToExport.filter(order => order.status === options.status);
    }

    const headers = ["Order ID", "Date", "Customer", "Status", "Payment Method", "Total"];
    const rows = ordersToExport.map(o => 
        [o.id, o.date.toDate().toLocaleString(), o.customerName || 'Walk-in', o.status, o.paymentMethod, o.total].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: `${ordersToExport.length} orders exported.` });
  };


  const ordersByStatus = (status: CompletedOrder['status']) => filteredOrders.filter(o => o.status === status);
  const TABS = ['All Orders', 'Completed', 'Pending', 'Cancelled'];

  const renderContent = (orders: CompletedOrder[]) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <OrdersTable 
        orders={orders} 
        onSelectOne={handleSelectOne}
        onSelectAll={handleSelectAll}
        selectedOrders={selectedOrders}
        allOrdersSelected={selectedOrders.length > 0 && selectedOrders.length === orders.length}
      />
    );
  };
  
  const getSelectedOrdersData = () => {
    return allOrders.filter(order => selectedOrders.includes(order.id));
  };

  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold font-headline">Regular Orders</h1>
        <Tabs defaultValue="All Orders">
            <div className="flex justify-between items-center">
                <TabsList>
                    {TABS.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
                </TabsList>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={selectedOrders.length === 0} onClick={handlePrintSelected}><Printer className="mr-2"/> Print Selected</Button>
                    <ExportDialog onExport={handleExport}>
                        <Button variant="outline"><FileDown className="mr-2"/> Export</Button>
                    </ExportDialog>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-start gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Search by Order ID or customer..." className="pl-10 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                                <span>Filter by date range</span>
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
                         <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by payment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Card">Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <TabsContent value="All Orders">
                      {renderContent(filteredOrders)}
                    </TabsContent>
                    <TabsContent value="Completed">
                      {renderContent(ordersByStatus('Completed'))}
                    </TabsContent>
                    <TabsContent value="Pending">
                      {renderContent(ordersByStatus('Pending'))}
                    </TabsContent>
                    <TabsContent value="Cancelled">
                      {renderContent(ordersByStatus('Cancelled'))}
                    </TabsContent>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{filteredOrders.length}</strong> of <strong>{allOrders.length}</strong> orders.
                    </div>
                </CardFooter>
            </Card>
        </Tabs>
        <div className="hidden">
           <div ref={selectedOrdersRef} className="p-8">
                <h1 className="text-2xl font-bold mb-4">Selected Orders</h1>
                {getSelectedOrdersData().map(order => (
                    <div key={order.id} className="mb-8 p-4 border rounded-lg page-break-before:always">
                        <h2 className="text-xl font-semibold mb-2">Order ID: {order.id.substring(0,7)}...</h2>
                        <p><strong>Date:</strong> {order.date.toDate().toLocaleString()}</p>
                        <p><strong>Customer:</strong> {order.customerName || 'Walk-in'}</p>
                        <p><strong>Status:</strong> {order.status}</p>
                        <Separator className="my-4" />
                        <h3 className="font-bold mb-2">Items</h3>
                        <Table>
                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {order.items.map(item => (
                                    <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell className="text-right">₦{(item.price * item.quantity).toFixed(2)}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Separator className="my-4" />
                        <div className="flex justify-end">
                            <div className="w-1/3 space-y-2">
                                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>₦{order.total.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
}
