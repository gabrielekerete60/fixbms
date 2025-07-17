
"use client";
import { useState } from "react";
import {
  FileDown,
  PlusCircle,
  Search,
  ListFilter,
  MoreHorizontal,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const promotionsData = [
    { id: "promo_1", name: "Weekend Special", description: "10% off all bread items", type: "percentage", value: 10, code: "WEEKEND10", startDate: "2024-01-01", endDate: "2024-12-31", status: "Active" },
    { id: "promo_2", name: "Free Drink", description: "Buy any 2 loaves, get a free drink", type: "free_item", value: null, code: "DRINKUP", startDate: "2024-05-01", endDate: "2024-05-31", status: "Expired" },
    { id: "promo_3", name: "Jumbo Discount", description: "₦100 off Jumbo Loaf", type: "fixed_amount", value: 100, code: "JUMBO100", startDate: "2024-06-01", endDate: "2024-06-30", status: "Active" },
    { id: "promo_4", name: "New Customer", description: "15% off first order", type: "percentage", value: 15, code: "NEW15", startDate: "2024-07-01", endDate: "2024-07-31", status: "Scheduled" }
];

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'active':
            return 'default';
        case 'expired':
            return 'destructive';
        case 'scheduled':
            return 'secondary';
        default:
            return 'outline';
    }
}

function CreatePromotionDialog() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Add New Promotion</DialogTitle>
        <DialogDescription>
          Fill in the details for the customer promotion.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
        <div className="grid gap-2">
          <Label htmlFor="promotion-name">Promotion Name</Label>
          <Input id="promotion-name" placeholder="e.g. Summer Sale" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="Describe the promotion" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="promo-code">Promo Code</Label>
            <Input id="promo-code" placeholder="e.g. SUMMER25" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
             <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage Discount</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount Discount</SelectItem>
                <SelectItem value="free_item">Free Item</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
         <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="value">Value</Label>
            <Input id="value" type="number" placeholder="0" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="usage-limit">Usage Limit</Label>
             <Input id="usage-limit" type="number" placeholder="0 for unlimited" />
          </div>
        </div>
         <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All Timezones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="africa/lagos">Africa/Lagos (WAT)</SelectItem>
              {/* Add other timezones as needed */}
            </SelectContent>
          </Select>
        </div>
         <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Start Date</Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
           <div className="grid gap-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Applicable Products</Label>
          <Input placeholder="Select products this applies to. Leave empty for all." />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Create Promotion</Button>
      </DialogFooter>
    </DialogContent>
  )
}


export default function PromotionsPage() {
  const [date, setDate] = useState<DateRange | undefined>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline">Promotions</h1>
         <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Promotion
                </Button>
            </DialogTrigger>
            <CreatePromotionDialog />
        </Dialog>
      </div>

      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="incentives">Staff Incentives</TabsTrigger>
        </TabsList>
        <TabsContent value="promotions">
          <Card>
            <CardHeader>
              <CardTitle>Manage Promotions</CardTitle>
              <CardDescription>
                View, create, and manage your promotional offers.
              </CardDescription>
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input placeholder="Search by name or code..." className="pl-10" />
                </div>
                <div className="flex items-center gap-2">
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
                            <DropdownMenuCheckboxItem checked>
                            Active
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem>Scheduled</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem>Expired</DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline">
                        <FileDown className="mr-2" /> Export
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox aria-label="Select all" />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotionsData.map((promo) => (
                    <TableRow key={promo.id}>
                       <TableCell>
                            <Checkbox aria-label={`Select promotion ${promo.name}`} />
                        </TableCell>
                      <TableCell className="font-medium">{promo.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{promo.code}</Badge>
                      </TableCell>
                       <TableCell className="capitalize">{promo.type.replace('_', ' ')}</TableCell>
                        <TableCell>
                            {promo.type === 'percentage' && `${promo.value}%`}
                            {promo.type === 'fixed_amount' && `₦${promo.value}`}
                            {promo.type === 'free_item' && 'N/A'}
                        </TableCell>
                      <TableCell>{new Date(promo.startDate).toLocaleDateString()}</TableCell>
                       <TableCell>{new Date(promo.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(promo.status)}>
                            {promo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="incentives">
            <Card>
                <CardHeader>
                    <CardTitle>Staff Incentives</CardTitle>
                    <CardDescription>This feature is coming soon.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Incentive logs will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    