
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStaffList, processPayroll, hasPayrollBeenProcessed, requestAdvanceSalary } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type StaffMember = {
    id: string;
    name: string;
    role: string;
    pay_rate: number;
    pay_type: 'Salary' | 'Hourly';
};

type PayrollEntry = {
    staffId: string;
    staffName: string;
    role: string;
    basePay: number;
    additions: number;
    totalDeductions: number;
};

function PayrollTab() {
    const { toast } = useToast();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [payrollPeriod, setPayrollPeriod] = useState(format(new Date(), 'yyyy-MM'));
    const [tempValues, setTempValues] = useState<Record<string, { additions?: string, deductions?: string }>>({});
    const [isPayrollProcessed, setIsPayrollProcessed] = useState(false);
    
    const initializePayroll = useCallback((staff: StaffMember[]) => {
        const initialPayroll = staff.reduce((acc, s) => {
            acc[s.id] = {
                staffId: s.id,
                staffName: s.name,
                role: s.role,
                basePay: s.pay_rate || 0,
                additions: 0,
                totalDeductions: 0,
            };
            return acc;
        }, {} as Record<string, PayrollEntry>);
        setPayrollData(initialPayroll);
        setTempValues({});
    }, []);
    
    useEffect(() => {
        async function fetchInitialData() {
            setIsLoading(true);
            try {
                const staff = await getStaffList();
                setStaffList(staff);
                if (staff.length > 0) {
                    initializePayroll(staff);
                }
                const periodString = format(new Date(payrollPeriod + '-02'), 'MMMM yyyy');
                const alreadyProcessed = await hasPayrollBeenProcessed(periodString);
                setIsPayrollProcessed(alreadyProcessed);

            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load payroll data.' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchInitialData();
    }, [initializePayroll, payrollPeriod, toast]);


    const handleTempChange = (staffId: string, field: 'additions' | 'deductions', value: string) => {
        setTempValues(prev => ({
            ...prev,
            [staffId]: {
                ...prev[staffId],
                [field]: value
            }
        }));
    };
    
    const applyChange = (staffId: string, field: 'additions' | 'totalDeductions') => {
        const tempFieldKey = field === 'additions' ? 'additions' : 'deductions';
        const valueStr = tempValues[staffId]?.[tempFieldKey];
        
        if (valueStr === undefined || valueStr === '') return;

        const numValue = Number(valueStr);
        if (isNaN(numValue)) return;
        
        setPayrollData(prev => {
            const newPayroll = { ...prev };
            const currentEntry = newPayroll[staffId];
            if (currentEntry) {
                const currentValue = currentEntry[field] || 0;
                newPayroll[staffId] = { ...currentEntry, [field]: currentValue + numValue };
            }
            return newPayroll;
        });

        setTempValues(prev => {
            const newStaffValues = { ...prev[staffId] };
            delete newStaffValues[tempFieldKey];
            return {
                ...prev,
                [staffId]: newStaffValues
            };
        });
    };

    const calculateTotals = (entry: PayrollEntry) => {
        const basePay = entry.basePay || 0;
        const additions = entry.additions || 0;
        const totalDeductions = entry.totalDeductions || 0;
        const grossPay = basePay + additions;
        const netPay = grossPay - totalDeductions;
        return { grossPay, netPay, totalDeductions };
    };
    
    const handleProcessPayroll = async () => {
        if (!payrollData || Object.keys(payrollData).length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No payroll data to process.'});
            return;
        }

        setIsProcessing(true);
        const payrollDataToProcess = Object.values(payrollData).map(p => {
            const { netPay } = calculateTotals(p);
            const simplifiedDeductions = {
                shortages: p.totalDeductions,
                advanceSalary: 0,
                debt: 0,
                fine: 0,
            };
            return {
                ...p,
                netPay,
                deductions: simplifiedDeductions,
                month: format(new Date(payrollPeriod), 'MMMM yyyy'),
            };
        });
            
        const result = await processPayroll(payrollDataToProcess, format(new Date(payrollPeriod), 'MMMM yyyy'));
        if (result.success) {
            toast({ title: 'Success!', description: 'Payroll has been processed and expenses logged.'});
            setIsPayrollProcessed(true);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsProcessing(false);
    }

    const grandTotals = useMemo(() => {
        return staffList.reduce((acc, staff) => {
            const entry = payrollData[staff.id];
            if (!entry) return acc;
            const { grossPay, netPay, totalDeductions } = calculateTotals(entry);
            acc.basePay += entry.basePay || 0;
            acc.additions += entry.additions || 0;
            acc.totalDeductions += totalDeductions;
            acc.grossPay += grossPay;
            acc.netPay += netPay;
            return acc;
        }, { basePay: 0, additions: 0, totalDeductions: 0, grossPay: 0, netPay: 0 });
    }, [staffList, payrollData]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Staff Payroll</CardTitle>
                        <CardDescription>
                            Manage staff salaries for the selected period.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                         <Label htmlFor="payroll-month" className="sr-only">Payroll Period</Label>
                         <Input 
                            id="payroll-month"
                            type="month"
                            value={payrollPeriod}
                            onChange={(e) => setPayrollPeriod(e.target.value)}
                            className="w-[200px]"
                         />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Name</TableHead>
                                <TableHead className="text-right">Base Pay (₦)</TableHead>
                                <TableHead>Additions (₦)</TableHead>
                                <TableHead className="text-right">Gross Pay (₦)</TableHead>
                                <TableHead>Total Deductions (₦)</TableHead>
                                <TableHead className="text-right font-bold">Net Pay (₦)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                        No staff members found. Please add staff in the "Staff Management" section.
                                    </TableCell>
                                </TableRow>
                            ) : staffList.map(staff => {
                                const entry = payrollData[staff.id];
                                if (!entry) return null; // Should not happen if initialized correctly
                                const { grossPay, netPay, totalDeductions } = calculateTotals(entry);
                                return (
                                    <TableRow key={entry.staffId}>
                                        <TableCell>{entry.staffName}</TableCell>
                                        <TableCell className="text-right">{entry.basePay.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Input 
                                                    type="number"
                                                    className="min-w-24"
                                                    value={tempValues[entry.staffId]?.additions || ''}
                                                    onChange={(e) => handleTempChange(entry.staffId, 'additions', e.target.value)}
                                                    placeholder={entry.additions.toLocaleString()}
                                                    disabled={isPayrollProcessed}
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => applyChange(entry.staffId, 'additions')} disabled={isPayrollProcessed}><Check className="h-4 w-4"/></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{grossPay.toLocaleString()}</TableCell>
                                        <TableCell>
                                             <div className="flex items-center gap-1">
                                                <Input 
                                                    type="number"
                                                    className="min-w-24"
                                                    value={tempValues[entry.staffId]?.deductions || ''}
                                                    onChange={(e) => handleTempChange(entry.staffId, 'deductions', e.target.value)}
                                                    placeholder={totalDeductions.toLocaleString()}
                                                    disabled={isPayrollProcessed}
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => applyChange(entry.staffId, 'totalDeductions')} disabled={isPayrollProcessed}><Check className="h-4 w-4"/></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{netPay.toLocaleString()}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                         <TableFooter>
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell>Grand Totals</TableCell>
                                <TableCell className="text-right">{grandTotals.basePay.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.additions.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.grossPay.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-destructive">{grandTotals.totalDeductions.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.netPay.toLocaleString()}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
            <CardFooter>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button disabled={isProcessing || isLoading || staffList.length === 0 || isPayrollProcessed}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPayrollProcessed ? 'Payroll Processed' : `Process Payroll for ${format(new Date(payrollPeriod + '-02'), 'MMMM yyyy')}`}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will finalize the payroll for {format(new Date(payrollPeriod + '-02'), 'MMMM yyyy')} and log it as an expense. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleProcessPayroll}>Confirm &amp; Process</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}

function AdvanceSalaryTab() {
    const { toast } = useToast();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getStaffList().then(list => {
            setStaffList(list);
            setIsLoading(false);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaff || !amount || Number(amount) <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a staff member and enter a valid amount.' });
            return;
        }
        setIsSubmitting(true);
        const staffMember = staffList.find(s => s.id === selectedStaff);
        const result = await requestAdvanceSalary(selectedStaff, Number(amount), staffMember?.name || 'Unknown');
        if (result.success) {
            toast({ title: 'Success', description: 'Salary advance has been recorded.' });
            setSelectedStaff('');
            setAmount('');
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }
    
    if (isLoading) {
        return (
             <div className="flex justify-center items-center h-full">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Request Salary Advance</CardTitle>
                <CardDescription>
                    Record an advance payment for a staff member. This will be deducted from their next payroll.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="staff-select">Select Staff Member</Label>
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                            <SelectTrigger id="staff-select">
                                <SelectValue placeholder="Select a staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {staffList.map(staff => (
                                    <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.role})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="advance-amount">Amount (₦)</Label>
                        <Input 
                            id="advance-amount" 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 10000"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Record Advance
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}

export default function PayrollPageContainer() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Payroll</h1>
            <Tabs defaultValue="payroll">
                <TabsList>
                    <TabsTrigger value="payroll">Monthly Payroll</TabsTrigger>
                    <TabsTrigger value="advance">Advance Salary</TabsTrigger>
                </TabsList>
                <TabsContent value="payroll" className="mt-4">
                    <PayrollTab />
                </TabsContent>
                <TabsContent value="advance" className="mt-4">
                    <AdvanceSalaryTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}

    