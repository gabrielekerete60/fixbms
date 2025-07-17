
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  amountOwed: number;
  amountPaid: number;
};

function SupplierDialog({
  isOpen,
  onOpenChange,
  onSave,
  supplier
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Supplier, 'id'>) => void;
  supplier: Supplier | null;
}) {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [amountOwed, setAmountOwed] = useState(0);
    const [amountPaid, setAmountPaid] = useState(0);

    useEffect(() => {
        if (supplier) {
            setName(supplier.name);
            setContactPerson(supplier.contactPerson);
            setPhone(supplier.phone);
            setEmail(supplier.email);
            setAddress(supplier.address);
            setAmountOwed(supplier.amountOwed);
            setAmountPaid(supplier.amountPaid);
        } else {
            setName("");
            setContactPerson("");
            setPhone("");
            setEmail("");
            setAddress("");
            setAmountOwed(0);
            setAmountPaid(0);
        }
    }, [supplier]);

    const handleSubmit = () => {
        if (!name || !contactPerson) {
            toast({ variant: 'destructive', title: 'Error', description: 'Supplier name and contact person are required.' });
            return;
        }
        onSave({ name, contactPerson, phone, email, address, amountOwed, amountPaid });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    <DialogDescription>
                        {supplier ? 'Update the details of this supplier.' : 'Fill in the details for the new supplier.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactPerson" className="text-right">Contact</Label>
                        <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Address</Label>
                        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amountOwed" className="text-right">Amount Owed (₦)</Label>
                        <Input id="amountOwed" type="number" value={amountOwed} onChange={(e) => setAmountOwed(Number(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amountPaid" className="text-right">Amount Paid (₦)</Label>
                        <Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>{supplier ? 'Save Changes' : 'Create Supplier'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SuppliersPage() {
    const { toast } = useToast();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const suppliersCollection = collection(db, "suppliers");
            const snapshot = await getDocs(suppliersCollection);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];
            setSuppliers(list);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch suppliers." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
        try {
            if (editingSupplier) {
                const ref = doc(db, "suppliers", editingSupplier.id);
                await updateDoc(ref, supplierData);
                toast({ title: "Success", description: "Supplier updated successfully." });
            } else {
                await addDoc(collection(db, "suppliers"), supplierData);
                toast({ title: "Success", description: "Supplier created successfully." });
            }
            fetchSuppliers();
        } catch (error) {
            console.error("Error saving supplier:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save supplier." });
        }
    };

    const handleDeleteSupplier = async () => {
        if (!supplierToDelete) return;
        try {
            await deleteDoc(doc(db, "suppliers", supplierToDelete.id));
            toast({ title: "Success", description: "Supplier deleted successfully." });
            fetchSuppliers();
        } catch (error) {
            console.error("Error deleting supplier:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete supplier." });
        } finally {
            setSupplierToDelete(null);
        }
    };
    
    const openAddDialog = () => {
        setEditingSupplier(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsDialogOpen(true);
    };

    const suppliersWithBalance = useMemo(() => {
        return suppliers.map(s => ({
            ...s,
            amountRemaining: s.amountOwed - s.amountPaid,
        }));
    }, [suppliers]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Suppliers</h1>
                <Button onClick={openAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
            </div>

            <SupplierDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveSupplier}
                supplier={editingSupplier}
            />

            <Card>
                <CardHeader>
                    <CardTitle>All Suppliers</CardTitle>
                    <CardDescription>
                        Manage your suppliers and their balances.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Amount Owed</TableHead>
                                <TableHead>Amount Paid</TableHead>
                                <TableHead>Amount Remaining</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : suppliersWithBalance.length > 0 ? (
                                suppliersWithBalance.map(supplier => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell>{supplier.contactPerson}</TableCell>
                                        <TableCell>{supplier.phone}</TableCell>
                                        <TableCell>₦{supplier.amountOwed.toFixed(2)}</TableCell>
                                        <TableCell>₦{supplier.amountPaid.toFixed(2)}</TableCell>
                                        <TableCell className={supplier.amountRemaining > 0 ? 'text-destructive' : 'text-green-600'}>
                                            ₦{supplier.amountRemaining.toFixed(2)}
                                        </TableCell>
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
                                                    <DropdownMenuItem onSelect={() => openEditDialog(supplier)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setSupplierToDelete(supplier)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No suppliers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the supplier "{supplierToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSupplier}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
