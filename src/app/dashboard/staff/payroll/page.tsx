
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStaffList, processPayroll } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";


type StaffMember = {
    id: string;
    name: string;
    role: string;
    pay_rate: number;
    pay_type: 'Salary' | 'Hourly';
};

type DeductionDetails = {
    shortages: number;
    advanceSalary: number;
    debt: number;
    fine: number;
}

type PayrollEntry = {
    staffId: string;
    staffName: string;
    role: string;
    basePay: number;
    additions: number;
    deductions: DeductionDetails;
    totalDeductions: number;
};

export default function PayrollPage() {
    const { toast } = useToast();
    const [payroll, setPayroll] = useState<PayrollEntry[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [payrollPeriod, setPayrollPeriod] = useState(format(new Date(), 'yyyy-MM'));

    const fetchStaffAndInitPayroll = useCallback(async () => {
        setIsLoading(true);
        try {
            const staffList = await getStaffList();
            if (staffList) {
                const initialPayroll = staffList.map(s => ({
                    staffId: s.id,
                    staffName: s.name,
                    role: s.role,
                    basePay: s.pay_rate || 0,
                    additions: 0,
                    deductions: { shortages: 0, advanceSalary: 0, debt: 0, fine: 0 },
                    totalDeductions: 0,
                }));
                setPayroll(initialPayroll);
            } else {
                 setPayroll([]);
            }
        } catch (error) {
            console.error("Error fetching staff list:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch staff list.' });
            setPayroll([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchStaffAndInitPayroll();
    }, [fetchStaffAndInitPayroll]);

    const handlePayrollChange = (staffId: string, field: 'additions' | 'totalDeductions', value: string) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return;
        setPayroll(prev => prev ? prev.map(p => p.staffId === staffId ? { ...p, [field]: numValue } : p) : null);
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
        if (!payroll || payroll.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No payroll data to process.'});
            return;
        }

        setIsProcessing(true);
        const payrollDataToProcess = payroll.map(p => {
            const { netPay } = calculateTotals(p);
            // This structure is now simplified as we only have total deductions from input
            const simplifiedDeductions = {
                shortages: p.totalDeductions, // Put all deductions into one category or keep it simple
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
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsProcessing(false);
    }
    
    const grandTotals = useMemo(() => {
        if (!payroll) return { basePay: 0, additions: 0, totalDeductions: 0, grossPay: 0, netPay: 0 };
        return payroll.reduce((acc, entry) => {
            const { grossPay, netPay, totalDeductions } = calculateTotals(entry);
            acc.basePay += entry.basePay || 0;
            acc.additions += entry.additions || 0;
            acc.totalDeductions += totalDeductions;
            acc.grossPay += grossPay;
            acc.netPay += netPay;
            return acc;
        }, { basePay: 0, additions: 0, totalDeductions: 0, grossPay: 0, netPay: 0 });
    }, [payroll]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Payroll</h1>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Staff Payroll</CardTitle>
                            <CardDescription>
                                Manage staff salaries for the current period.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                             <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                             <Input 
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
                                    <TableHead className="text-right">Additions (₦)</TableHead>
                                    <TableHead className="text-right">Gross Pay (₦)</TableHead>
                                    <TableHead className="text-right">Total Deductions (₦)</TableHead>
                                    <TableHead className="text-right font-bold">Net Pay (₦)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!payroll || payroll.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                            No staff members found. Please add staff in the "Staff Management" section.
                                        </TableCell>
                                    </TableRow>
                                ) : payroll.map(entry => {
                                    const { grossPay, netPay } = calculateTotals(entry);
                                    return (
                                        <TableRow key={entry.staffId}>
                                            <TableCell>{entry.staffName}</TableCell>
                                            <TableCell className="text-right">{entry.basePay.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number"
                                                    className="min-w-24 text-right"
                                                    value={entry.additions}
                                                    onChange={(e) => handlePayrollChange(entry.staffId, 'additions', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">{grossPay.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                 <Input 
                                                    type="number"
                                                    className="min-w-24 text-right"
                                                    value={entry.totalDeductions}
                                                    onChange={(e) => handlePayrollChange(entry.staffId, 'totalDeductions', e.target.value)}
                                                    placeholder="0"
                                                />
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
                             <Button disabled={isProcessing || isLoading || !payroll || payroll.length === 0}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Process Payroll for {format(new Date(payrollPeriod + '-02'), 'MMMM yyyy')}
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
                                <AlertDialogAction onClick={handleProcessPayroll}>Confirm & Process</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
