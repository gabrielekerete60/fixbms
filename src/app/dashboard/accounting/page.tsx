"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import { getAccountingReport, AccountingReport } from "@/app/actions";

function StatRow({ label, value, isNegative, isBold }: { label: string, value: number, isNegative?: boolean, isBold?: boolean }) {
    const formattedValue = `₦${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const finalValue = isNegative ? `-${formattedValue}` : formattedValue;
    const valueColor = isNegative ? 'text-destructive' : '';
    const fontWeight = isBold ? 'font-bold' : '';

    return (
        <div className={`flex justify-between py-2 text-sm ${fontWeight}`}>
            <span>{label}</span>
            <span className={valueColor}>{finalValue}</span>
        </div>
    );
}


export default function AccountingPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 1),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(true);
    const [report, setReport] = useState<AccountingReport | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            if (!date?.from || !date?.to) return;
            setIsLoading(true);
            const reportData = await getAccountingReport({ from: date.from, to: date.to });
            setReport(reportData);
            setIsLoading(false);
        };
        fetchReport();
    }, [date]);

    const PnLContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            )
        }
        if (!report) {
             return (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <p>Could not load accounting report.</p>
                </div>
            )
        }
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Trading Account</h3>
                    <StatRow label="Sales" value={report.sales} />
                    <Separator />
                    <StatRow label="Less: Cost of Goods Sold" value={report.costOfGoodsSold} />
                     <Separator />
                    <StatRow label="Gross Profit" value={report.grossProfit} isNegative={report.grossProfit < 0} isBold />
                </div>
                 <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Profit & Loss Account</h3>
                     <StatRow label="Gross Profit b/f" value={report.grossProfit} />
                    <Separator />
                    <StatRow label="Less: Expenses" value={report.expenses} />
                    <Separator />
                    <StatRow label={report.netProfit >= 0 ? "Net Profit" : "Net Loss"} value={report.netProfit} isNegative={report.netProfit < 0} isBold />
                </div>
             </div>
        );
    }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Accounting</h1>
          <p className="text-muted-foreground">Manage all financial aspects of your bakery.</p>
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
            <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export to CSV</Button>
        </div>
      </div>
      
      <Tabs defaultValue="profit-loss">
        <TabsList>
          <TabsTrigger value="profit-loss">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="debtors-creditors">Debtors/Creditors</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payments-requests">Payments &amp; Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="profit-loss" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Trading Profit or Loss Account</CardTitle>
                    <CardDescription>
                       Generated for the period: {date?.from ? format(date.from, "PPP") : ''} - {date?.to ? format(date.to, "PPP") : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PnLContent />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="debtors-creditors" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Debtors &amp; Creditors</CardTitle>
                    <CardDescription>Coming soon.</CardDescription>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Debtors and Creditors information will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="expenses" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Expenses</CardTitle>
                    <CardDescription>Coming soon.</CardDescription>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Expense tracking will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="payments-requests" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Payments &amp; Requests</CardTitle>
                    <CardDescription>Coming soon.</CardDescription>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Payment requests and logs will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
