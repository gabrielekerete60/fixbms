

"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Loader2, ShieldCheck, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type Staff = {
  staff_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  pay_type: 'Salary' | 'Hourly';
  pay_rate: number;
  password?: string;
  timezone?: string;
  bank_name?: string;
  account_number?: string;
  mfa_enabled?: boolean;
  mfa_secret?: string;
};

const getStatusVariant = (status: boolean) => {
  return status ? "default" : "secondary";
};

function StaffDialog({
  isOpen,
  onOpenChange,
  onSave,
  staff,
  onRefresh,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Staff, 'staff_id'>, staffId?: string) => void;
  staff: Partial<Staff> | null;
  onRefresh: () => void;
}) {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [payType, setPayType] = useState<Staff['pay_type']>('Salary');
    const [payRate, setPayRate] = useState(0);
    const [password, setPassword] = useState("");
    const [timezone, setTimezone] = useState("Africa/Lagos");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [isMfaEnabled, setIsMfaEnabled] = useState(false);
    
    // MFA state
    const [mfaSetupKey, setMfaSetupKey] = useState<string | null>(null);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [isGeneratingMfa, setIsGeneratingMfa] = useState(false);


    const availableRoles = [
        "Manager", "Supervisor", "Accountant", "Showroom Staff", "Delivery Staff", "Baker", "Cleaner", "Storekeeper"
    ];

    useEffect(() => {
        if (staff) {
            setName(staff.name || "");
            setEmail(staff.email || "");
            setRole(staff.role || "");
            setPayType(staff.pay_type || "Salary");
            setPayRate(staff.pay_rate || 0);
            setPassword("");
            setTimezone(staff.timezone || "Africa/Lagos");
            setBankName(staff.bank_name || "");
            setAccountNumber(staff.account_number || "");
            setIsActive(staff.is_active === undefined ? true : staff.is_active);
            setIsMfaEnabled(staff.mfa_enabled || false);

            // Reset MFA setup when dialog opens/changes
            setMfaSetupKey(null);
            setMfaQrCode(null);
        }
    }, [staff]);

    const generateMfaSetup = () => {
        setIsGeneratingMfa(true);
        const secret = speakeasy.generateSecret.call(speakeasy, {
            name: `BMS (${staff?.email})`
        });
        setMfaSetupKey(secret.base32);
        QRCode.toDataURL(secret.otpauth_url!, (err, data_url) => {
            if (err) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not generate QR code.' });
                 setMfaSetupKey(null);
            } else {
                setMfaQrCode(data_url);
            }
            setIsGeneratingMfa(false);
        });
    }

    const handleEnableMfa = async () => {
        if (!staff?.staff_id || !mfaSetupKey) {
            toast({ variant: 'destructive', title: 'Error', description: 'No setup key to enable.' });
            return;
        }

        const staffData: Partial<Omit<Staff, 'staff_id'>> = {
            mfa_enabled: true,
            mfa_secret: mfaSetupKey,
        };
        onSave(staffData as Omit<Staff, 'staff_id'>, staff.staff_id);
        onOpenChange(false);
    }
    
    const handleDisableMfa = async () => {
        if (!staff?.staff_id) return;
        
        const staffData: Partial<Omit<Staff, 'staff_id'>> = {
            mfa_enabled: false,
            mfa_secret: '',
        };
        onSave(staffData as Omit<Staff, 'staff_id'>, staff.staff_id);
        onOpenChange(false);
    }


    const handleSubmit = () => {
        if (!name || !role || !email) {
            toast({ variant: 'destructive', title: 'Error', description: 'Staff name, email and role are required.' });
            return;
        }
        if (!staff?.staff_id && !password) {
            toast({ variant: 'destructive', title: 'Error', description: 'Password is required for new staff members.' });
            return;
        }

        const staffData: Partial<Omit<Staff, 'staff_id'>> = {
            name,
            email,
            role,
            pay_type: payType,
            pay_rate: Number(payRate),
            timezone,
            bank_name: bankName,
            account_number: accountNumber,
            is_active: isActive,
        };
        
        if (password) {
            staffData.password = password;
        }

        onSave(staffData as Omit<Staff, 'staff_id'>, staff?.staff_id);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{staff?.staff_id ? `Edit ${staff.name}` : 'Add New Staff Member'}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="details">
                     <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Staff Details</TabsTrigger>
                        <TabsTrigger value="security" disabled={!staff?.staff_id}>Security (MFA)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Full Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email Address</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={role} onValueChange={setRole}>
                                        <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="pay_type">Pay Type</Label>
                                    <Select value={payType} onValueChange={(v) => setPayType(v as Staff['pay_type'])}>
                                        <SelectTrigger><SelectValue placeholder="Select pay type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Salary">Salary</SelectItem>
                                            <SelectItem value="Hourly">Hourly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pay_rate">Pay Rate (NGN)</Label>
                                <Input id="pay_rate" type="number" value={payRate} onChange={(e) => setPayRate(parseFloat(e.target.value))} />
                                <p className="text-xs text-muted-foreground px-1">Enter hourly rate or monthly salary based on pay type.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={staff?.staff_id ? "Leave blank to keep unchanged" : "Set initial password"} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="timezone">Timezone</Label>
                                <Select value={timezone} onValueChange={setTimezone}>
                                    <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 pt-2">
                                <h3 className="font-medium">Bank Details (for Payroll)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="bank_name">Bank Name</Label>
                                        <Input id="bank_name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="account_number">Account Number</Label>
                                        <Input id="account_number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="is_active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked as boolean)} />
                                <label htmlFor="is_active" className="text-sm font-medium leading-none">Is Active</label>
                            </div>
                        </div>
                         <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSubmit}>{staff?.staff_id ? 'Save Changes' : 'Create Staff'}</Button>
                        </DialogFooter>
                    </TabsContent>
                    <TabsContent value="security">
                        <div className="py-4 space-y-4">
                            <Alert>
                                <ShieldCheck className="h-4 w-4" />
                                <AlertTitle>What is MFA?</AlertTitle>
                                <AlertDescription>
                                    Multi-Factor Authentication adds an extra layer of security. The user will need a code from an app like Google Authenticator to log in.
                                </AlertDescription>
                            </Alert>
                            {isMfaEnabled ? (
                                <div className="text-center space-y-4">
                                    <p>MFA is currently <span className="font-bold text-green-500">ENABLED</span> for this user.</p>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">Disable MFA</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will remove the extra security layer from this account.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDisableMfa}>Yes, Disable</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ) : mfaSetupKey && mfaQrCode ? (
                                <div className="space-y-4 text-center">
                                    <p>Scan the QR code with an authenticator app (e.g., Google Authenticator).</p>
                                     <div className="flex justify-center">
                                       <img src={mfaQrCode} alt="MFA QR Code" />
                                     </div>
                                    <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <code className="p-2 bg-muted rounded-md">{mfaSetupKey}</code>
                                        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(mfaSetupKey); toast({title: "Copied!"}) }}><Copy className="h-4 w-4"/></Button>
                                    </div>
                                    <Button onClick={handleEnableMfa}>Confirm and Enable MFA</Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="mb-4">MFA is currently <span className="font-bold text-destructive">DISABLED</span>.</p>
                                    <Button onClick={generateMfaSetup} disabled={isGeneratingMfa}>
                                        {isGeneratingMfa && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Generate Setup Key
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function StaffDetailDialog({ staff, isOpen, onOpenChange }: { staff: Staff | null; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    if (!staff) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{staff.name}</DialogTitle>
                    <DialogDescription>{staff.role} - Staff ID: {staff.staff_id}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://placehold.co/64x64.png?text=${staff.name.charAt(0)}`} alt={staff.name} data-ai-hint="person face" />
                            <AvatarFallback>{staff.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                            <p><strong>Email:</strong> {staff.email}</p>
                            <p><strong>Status:</strong> <Badge variant={getStatusVariant(staff.is_active)}>{staff.is_active ? 'Active' : 'Inactive'}</Badge></p>
                             <p><strong>MFA:</strong> <Badge variant={staff.mfa_enabled ? "default" : "secondary"}>{staff.mfa_enabled ? 'Enabled' : 'Disabled'}</Badge></p>
                        </div>
                    </div>
                    
                    <Card>
                        <CardHeader className="p-4">
                            <CardTitle className="text-base">Payment Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Pay Type:</span>
                                <span>{staff.pay_type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Pay Rate:</span>
                                <span>₦{(staff.pay_rate || 0).toLocaleString()} / {staff.pay_type === 'Salary' ? 'month' : 'hour'}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Bank Name:</span>
                                <span>{staff.bank_name || 'Not set'}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Account Number:</span>
                                <span>{staff.account_number || 'Not set'}</span>
                            </div>
                        </CardContent>
                    </Card>

                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function StaffManagementPage() {
    const { toast } = useToast();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
    const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

    const fetchStaff = useCallback(async () => {
        setIsLoading(true);
        try {
            const staffCollection = collection(db, "staff");
            const snapshot = await getDocs(staffCollection);
            const list = snapshot.docs
                .map(doc => ({ staff_id: doc.id, ...doc.data() }))
                .filter(staff => staff.role !== 'Developer') as Staff[];
            setStaffList(list);
        } catch (error) {
            console.error("Error fetching staff:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch staff members." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchStaff();
        window.addEventListener('focus', fetchStaff);
        return () => {
            window.removeEventListener('focus', fetchStaff);
        };
    }, [fetchStaff]);

    const handleSaveStaff = async (staffData: Omit<Staff, 'staff_id'>, staffId?: string) => {
        try {
            if (staffId) { // Editing existing staff
                const ref = doc(db, "staff", staffId);
                await updateDoc(ref, staffData);
                toast({ title: "Success", description: "Staff member updated successfully." });
            } else { // Creating new staff
                const newId = (Math.floor(Math.random() * 900000) + 100000).toString();
                const newStaffRef = doc(db, "staff", newId);
                await setDoc(newStaffRef, staffData);
                toast({ title: "Success", description: "Staff member created successfully." });
            }
            fetchStaff();
        } catch (error) {
            console.error("Error saving staff member:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save staff member." });
        }
    };

    const handleDeleteStaff = async () => {
        if (!staffToDelete) return;
        try {
            await deleteDoc(doc(db, "staff", staffToDelete.staff_id));
            toast({ title: "Success", description: "Staff member deleted successfully." });
            fetchStaff();
        } catch (error) {
            console.error("Error deleting staff member:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete staff member." });
        } finally {
            setStaffToDelete(null);
        }
    };
    
    const openAddDialog = () => {
        setEditingStaff({});
        setIsFormDialogOpen(true);
    };

    const openEditDialog = (staff: Staff) => {
        setEditingStaff(staff);
        setIsFormDialogOpen(true);
    };
    
    const openDetailDialog = (staff: Staff) => {
        setViewingStaff(staff);
        setIsDetailDialogOpen(true);
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-bold font-headline">Staff</h1>
                <Button onClick={openAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
                </Button>
            </div>

            <StaffDialog
                isOpen={isFormDialogOpen}
                onOpenChange={setIsFormDialogOpen}
                onSave={handleSaveStaff}
                staff={editingStaff}
                onRefresh={fetchStaff}
            />

            <StaffDetailDialog
                staff={viewingStaff}
                isOpen={isDetailDialogOpen}
                onOpenChange={setIsDetailDialogOpen}
            />

            <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <CardTitle>Manage Staff</CardTitle>
                    <CardDescription>
                        A list of all staff members in your bakery.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Pay Rate</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : staffList.length > 0 ? (
                                staffList.map(staff => (
                                    <TableRow key={staff.staff_id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={`https://placehold.co/40x40.png?text=${staff.name.charAt(0)}`} alt={staff.name} data-ai-hint="person face" />
                                                    <AvatarFallback>{staff.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold">{staff.name}</div>
                                                    <div className="text-sm text-muted-foreground">{staff.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{staff.role}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(staff.is_active)}>
                                                {staff.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>₦{(staff.pay_rate || 0).toLocaleString()}/{staff.pay_type === 'Salary' ? 'mo' : 'hr'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onSelect={() => openEditDialog(staff)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => openDetailDialog(staff)}>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem disabled>Pay Staff</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setStaffToDelete(staff)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No staff members found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the staff member "{staffToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStaff}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
