
"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
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
import { Eye, Printer, FileDown, MoreHorizontal, Calendar as CalendarIcon, ListFilter, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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


type CartItem = {
  id: number;
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
  date: string;
  paymentMethod: 'Card' | 'Paystack';
  customerName?: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

function Receipt({ order }: { order: CompletedOrder }) {
   const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptHtml = document.getElementById(`receipt-${order.id}`)?.innerHTML;
      if (receiptHtml) {
        printWindow.document.write(`<html><head><title>Receipt ${order.id}</title>`);
        printWindow.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .mt-4 { margin-top: 16px; } .mb-4 { margin-bottom: 16px; } .space-y-1 > * + * { margin-top: 4px; } .flex { display: flex; } .justify-between { justify-content: space-between; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(receiptHtml);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
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
                <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
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
                    {order.items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">₦{(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
                <Separator />
                <div className="w-full space-y-1 text-sm pr-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₦{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (7.5%)</span>
                    <span className="font-medium">₦{order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base mt-1">
                    <span>Total</span>
                    <span>₦{order.total.toFixed(2)}</span>
                </div>
            </div>
            <Separator />
            <p className="text-center text-xs text-muted-foreground">Thank you for your patronage!</p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handlePrintReceipt}><Printer className="mr-2 h-4 w-4"/> Print</Button>
      </div>
    </DialogContent>
  );
}

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

function OrdersTable({ orders, onSelectOne, selectedOrders }: { orders: CompletedOrder[], onSelectOne: (id: string, checked: boolean) => void, selectedOrders: string[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead padding="checkbox">
                       <Checkbox
                            checked={selectedOrders.length > 0 && selectedOrders.length === orders.length}
                            onCheckedChange={(checked) => {
                                if(checked) {
                                    orders.forEach(o => onSelectOne(o.id, true));
                                } else {
                                     orders.forEach(o => onSelectOne(o.id, false));
                                }
                            }}
                            aria-label="Select all"
                        />
                    </TableHead>
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
                        <TableRow key={order.id} data-state={selectedOrders.includes(order.id) && "selected"}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={selectedOrders.includes(order.id)}
                                    onCheckedChange={(checked) => onSelectOne(order.id, checked as boolean)}
                                    aria-label={`Select order ${order.id}`}
                                />
                            </TableCell>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                            <TableCell>{order.customerName || 'Walk-in'}</TableCell>
                            <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                            <TableCell>
                                <Badge variant={order.paymentMethod === 'Card' ? 'secondary' : 'default'}>
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
                               <Dialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DialogTrigger asChild>
                                                <DropdownMenuItem>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>View Details</span>
                                                </DropdownMenuItem>
                                             </DialogTrigger>
                                             <DropdownMenuItem>
                                                <Printer className="mr-2 h-4 w-4" />
                                                <span>Print Receipt</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Receipt order={order} />
                               </Dialog>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}


export default function RegularOrdersPage() {
  const [allOrders] = useLocalStorage<CompletedOrder[]>('completedOrders', []);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      if (!date?.from) return true;
      const orderDate = new Date(order.date);
      if (date.to) {
        return orderDate >= date.from && orderDate <= date.to;
      }
      return orderDate >= date.from;
    });
  }, [allOrders, date]);

  const handleSelectOne = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => {
        if (checked) {
            return [...prev, orderId];
        } else {
            return prev.filter(id => id !== orderId);
        }
    });
  }

  const ordersByStatus = (status: CompletedOrder['status']) => filteredOrders.filter(o => o.status === status);
  const TABS = ['All Orders', 'Completed', 'Pending', 'Cancelled'];

  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold font-headline">Regular Orders</h1>
        <Tabs defaultValue="All Orders">
            <TabsList>
                {TABS.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
            </TabsList>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>Completed Orders</CardTitle>
                            <CardDescription>A list of all successfully completed transactions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input placeholder="Search by Order ID or customer..." className="pl-10 w-64" />
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
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="ml-auto">
                                    <ListFilter className="mr-2 h-4 w-4" />
                                    Filter by Status
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem checked>Completed</DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem>Pending</DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem>Cancelled</DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="outline" disabled={selectedOrders.length === 0}><Printer className="mr-2"/> Print Selected</Button>
                            <Button variant="outline"><FileDown className="mr-2"/> Export</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <TabsContent value="All Orders">
                        <OrdersTable orders={filteredOrders} onSelectOne={handleSelectOne} selectedOrders={selectedOrders} />
                    </TabsContent>
                    <TabsContent value="Completed">
                        <OrdersTable orders={ordersByStatus('Completed')} onSelectOne={handleSelectOne} selectedOrders={selectedOrders} />
                    </TabsContent>
                    <TabsContent value="Pending">
                         <OrdersTable orders={ordersByStatus('Pending')} onSelectOne={handleSelectOne} selectedOrders={selectedOrders} />
                    </TabsContent>
                    <TabsContent value="Cancelled">
                         <OrdersTable orders={ordersByStatus('Cancelled')} onSelectOne={handleSelectOne} selectedOrders={selectedOrders} />
                    </TabsContent>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{filteredOrders.length}</strong> of <strong>{allOrders.length}</strong> orders.
                    </div>
                </CardFooter>
            </Card>
        </Tabs>
    </div>
  )
}

    
