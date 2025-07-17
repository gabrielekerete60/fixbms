
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
import { Eye, Printer, FileDown, MoreHorizontal } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
          <DialogTitle className="font-headline text-2xl text-center">Sweet Track</DialogTitle>
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

export default function RegularOrdersPage() {
  const [completedOrders] = useLocalStorage<CompletedOrder[]>('completedOrders', []);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();

  const filteredOrders = useMemo(() => {
    return completedOrders.filter(order => {
      if (!date?.from) return true;
      const orderDate = new Date(order.date);
      if (date.to) {
        return orderDate >= date.from && orderDate <= date.to;
      }
      return orderDate >= date.from;
    });
  }, [completedOrders, date]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  }

  const handleSelectOne = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  }

  const isAllSelected = selectedOrders.length > 0 && selectedOrders.length === filteredOrders.length;


  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold font-headline">Regular Orders</h1>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                     <div>
                        <CardTitle>Completed Orders</CardTitle>
                        <CardDescription>A list of all successfully completed transactions.</CardDescription>
                     </div>
                     <div className="flex items-center gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-[300px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
                            >
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
                        <Button variant="outline" disabled={selectedOrders.length === 0}><Printer className="mr-2"/> Print Selected</Button>
                        <Button variant="outline"><FileDown className="mr-2"/> Export</Button>
                     </div>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead padding="checkbox">
                               <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date</TableHead>
                             <TableHead>Customer</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No completed orders found for the selected period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map((order) => (
                                <TableRow key={order.id} data-state={selectedOrders.includes(order.id) && "selected"}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedOrders.includes(order.id)}
                                            onCheckedChange={(checked) => handleSelectOne(order.id, checked as boolean)}
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
            </CardContent>
            <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Showing <strong>{filteredOrders.length}</strong> of <strong>{completedOrders.length}</strong> orders.
                </div>
            </CardFooter>
        </Card>
    </div>
  )
}
