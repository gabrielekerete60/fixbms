
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStaffList, processPayroll } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Coins, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

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
    basePay: number;
    additions: number;
    deductions: DeductionDetails;
};

function ManageDeductionsDialog({ entry, onSave, children }: { entry: Partial<PayrollEntry>, onSave: (deductions: DeductionDetails) => void, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [deductions, setDeductions] = useState<DeductionDetails>({
        shortages: 0,
        advanceSalary: 0,
        debt: 0,
        fine: 0,
    });

    useEffect(() => {
        if (isOpen) {
            setDeductions(entry.deductions || { shortages: 0, advanceSalary: 0, debt: 0, fine: 0 });
        }
    }, [isOpen, entry.deductions]);

    const handleSave = () => {
        onSave(deductions);
        setIsOpen(false);
    }
    
    const handleDeductionChange = (field: keyof DeductionDetails, value: string) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return;
        setDeductions(prev => ({...prev, [field]: numValue }));
    }

    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Deductions for {entry.staffName}</DialogTitle>
                    <DialogDescription>
                        Specify the breakdown of any deductions from the gross pay.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="shortages">Shortages (₦)</Label>
                            <Input id="shortages" type="number" value={deductions.shortages} onChange={e => handleDeductionChange('shortages', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advanceSalary">Advance Salary (₦)</Label>
                            <Input id="advanceSalary" type="number" value={deductions.advanceSalary} onChange={e => handleDeductionChange('advanceSalary', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="debt">Debt (₦)</Label>
                            <Input id="debt" type="number" value={deductions.debt} onChange={e => handleDeductionChange('debt', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fine">Fines (₦)</Label>
                            <Input id="fine" type="number" value={deductions.fine} onChange={e => handleDeductionChange('fine', e.target.value)} />
                        </div>
                    </div>
                    <div className="pt-4 font-bold text-lg flex justify-between border-t">
                        <span>Total Deductions:</span>
                        <span>₦{totalDeductions.toLocaleString()}</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Deductions</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PayrollPage() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [payroll, setPayroll] = useState<Record<string, Partial<PayrollEntry>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [payrollPeriod, setPayrollPeriod] = useState(format(new Date(), 'MMMM yyyy'));

    const fetchStaff = useCallback(async () => {
        setIsLoading(true);
        try {
            const staffList = await getStaffList();
            setStaff(staffList);
            // Initialize payroll state
            const initialPayroll: Record<string, Partial<PayrollEntry>> = {};
            staffList.forEach(s => {
                initialPayroll[s.id] = {
                    staffId: s.id,
                    staffName: s.name,
                    basePay: s.pay_rate || 0,
                    additions: 0,
                    deductions: { shortages: 0, advanceSalary: 0, debt: 0, fine: 0 },
                };
            });
            setPayroll(initialPayroll);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch staff list.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handlePayrollChange = (staffId: string, field: 'additions', value: string) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return;

        setPayroll(prev => ({
            ...prev,
            [staffId]: {
                ...prev[staffId],
                [field]: numValue
            }
        }));
    };
    
    const handleDeductionsSave = (staffId: string, deductions: DeductionDetails) => {
        setPayroll(prev => ({
            ...prev,
            [staffId]: {
                ...prev[staffId],
                deductions
            }
        }));
    };

    const calculateTotals = (staffId: string) => {
        const entry = payroll[staffId];
        if (!entry) return { grossPay: 0, netPay: 0, totalDeductions: 0 };
        const basePay = entry.basePay || 0;
        const additions = entry.additions || 0;
        const totalDeductions = Object.values(entry.deductions || {}).reduce((sum, val) => sum + val, 0);
        const grossPay = basePay + additions;
        const netPay = grossPay - totalDeductions;
        return { grossPay, netPay, totalDeductions };
    };
    
    const handleProcessPayroll = async () => {
        setIsProcessing(true);
        const payrollDataToProcess = Object.values(payroll)
            .map(p => {
                const { netPay } = calculateTotals(p.staffId!);
                return {
                    staffId: p.staffId!,
                    staffName: p.staffName!,
                    basePay: p.basePay || 0,
                    additions: p.additions || 0,
                    deductions: p.deductions || { shortages: 0, advanceSalary: 0, debt: 0, fine: 0 },
                    netPay,
                    month: payrollPeriod,
                };
            })
            .filter(p => p.netPay > 0);
            
        if (payrollDataToProcess.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No payroll data to process.'});
            setIsProcessing(false);
            return;
        }

        const result = await processPayroll(payrollDataToProcess, payrollPeriod);
        if (result.success) {
            toast({ title: 'Success!', description: 'Payroll has been processed and expenses logged.'});
            // Optionally clear the form
            fetchStaff();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }

        setIsProcessing(false);
    }
    
    const grandTotals = Object.keys(payroll).reduce((acc, staffId) => {
        const { grossPay, netPay, totalDeductions } = calculateTotals(staffId);
        const entry = payroll[staffId];
        acc.basePay += entry?.basePay || 0;
        acc.additions += entry?.additions || 0;
        acc.totalDeductions += totalDeductions;
        acc.grossPay += grossPay;
        acc.netPay += netPay;
        return acc;
    }, { basePay: 0, additions: 0, totalDeductions: 0, grossPay: 0, netPay: 0 });

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
                                value={format(new Date(payrollPeriod), 'yyyy-MM')}
                                onChange={(e) => setPayrollPeriod(format(new Date(e.target.value), 'MMMM yyyy'))}
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
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                                ) : staff.map(s => {
                                    const { grossPay, netPay, totalDeductions } = calculateTotals(s.id);
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>{s.name}<br/><span className="text-xs text-muted-foreground">{s.role}</span></TableCell>
                                            <TableCell className="text-right">{(payroll[s.id]?.basePay || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number"
                                                    className="min-w-24 text-right"
                                                    value={payroll[s.id]?.additions || ''}
                                                    onChange={(e) => handlePayrollChange(s.id, 'additions', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">{grossPay.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <ManageDeductionsDialog 
                                                    entry={payroll[s.id] || {}} 
                                                    onSave={(deductions) => handleDeductionsSave(s.id, deductions)}
                                                >
                                                    <Button variant="link" className="p-0 h-auto">
                                                        {totalDeductions.toLocaleString()}
                                                    </Button>
                                                </ManageDeductionsDialog>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{netPay.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                             <TableRow className="bg-muted/50 font-bold">
                                <TableCell>Grand Totals</TableCell>
                                <TableCell className="text-right">{grandTotals.basePay.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.additions.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.grossPay.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.totalDeductions.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{grandTotals.netPay.toLocaleString()}</TableCell>
                            </TableRow>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleProcessPayroll} disabled={isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Process Payroll for {payrollPeriod}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
