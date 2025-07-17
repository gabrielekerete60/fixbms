
"use client";

import { useState } from "react";
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
import { Eye, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold font-headline">Regular Orders</h1>
        <Card>
            <CardHeader>
                <CardTitle>Completed Orders</CardTitle>
                <CardDescription>A list of all successfully completed transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {completedOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No completed orders yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            completedOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.id}</TableCell>
                                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                                    <TableCell>
                                        <Badge variant={order.paymentMethod === 'Card' ? 'secondary' : 'default'}>
                                            {order.paymentMethod}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">₦{order.total.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                       <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
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
                    Showing <strong>{completedOrders.length}</strong> orders.
                </div>
            </CardFooter>
        </Card>
    </div>
  )
}

