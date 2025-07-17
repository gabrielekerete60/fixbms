
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

type TransferItem = {
  productId: string;
  quantity: number;
};

type StaffMember = {
  staff_id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
};

export default function StockControlPage() {
  const [transferTo, setTransferTo] = useState("");
  const [isSalesRun, setIsSalesRun] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([
    { productId: "", quantity: 1 },
  ]);
  const [initiatedTransfers, setInitiatedTransfers] = useState<any[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();

  // Mock data - in a real app, this would come from Firestore
  const staff: StaffMember[] = [
    { staff_id: "400004", name: "Mfon Staff" },
    { staff_id: "400005", name: "Akan Staff" },
    { staff_id: "500006", name: "Blessing Baker" },
  ];

  const products: Product[] = [
    { id: "prod_1", name: "Family Loaf" },
    { id: "prod_2", name: "Burger Loaf" },
    { id: "prod_3", name: "Jumbo Loaf" },
    { id: "prod_4", name: "Round Loaf" },
  ];

  const handleItemChange = (
    index: number,
    field: keyof TransferItem,
    value: string | number
  ) => {
    const newItems = [...items];
    if (field === "productId") {
      newItems[index].productId = value as string;
    } else {
      newItems[index].quantity = Number(value);
    }
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Logic to submit transfer would go here
    console.log({ transferTo, isSalesRun, notes, items });
    // Add to initiated transfers list for demo
    const newTransfer = {
      date: new Date().toISOString(),
      to: staff.find(s => s.staff_id === transferTo)?.name || 'Unknown',
      items: items.reduce((sum, item) => sum + item.quantity, 0),
      status: 'pending'
    };
    setInitiatedTransfers([newTransfer, ...initiatedTransfers]);
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
            <div className="absolute top-1 right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">1</div>
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
                    <Select value={transferTo} onValueChange={setTransferTo}>
                      <SelectTrigger id="transfer-to">
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="sales-run" checked={isSalesRun} onCheckedChange={(checked) => setIsSalesRun(checked as boolean)}/>
                        <div className="grid gap-1.5 leading-none">
                            <label
                            htmlFor="sales-run"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                      className="grid grid-cols-[1fr_100px_auto] gap-2 items-center"
                    >
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          handleItemChange(index, "productId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
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
                <Button onClick={handleSubmit}>Submit Transfer</Button>
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
                    {initiatedTransfers.length > 0 ? (
                        initiatedTransfers.map((transfer, index) => (
                             <TableRow key={index}>
                                <TableCell>{new Date(transfer.date).toLocaleString()}</TableCell>
                                <TableCell>{transfer.to}</TableCell>
                                <TableCell>{transfer.items}</TableCell>
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
