
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { MoreHorizontal, PlusCircle, Loader2, Search } from "lucide-react";
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, orderBy, increment, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type User = {
    name: string;
    role: string;
    staff_id: string;
};

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

type Ingredient = {
    id: string;
    name: string;
    unit: string;
    costPerUnit: number;
}

type SupplyLog = {
    id: string;
    supplierId: string;
    supplierName: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
    date: string;
    invoiceNumber?: string;
}

function SupplierDialog({
  isOpen,
  onOpenChange,
  onSave,
  supplier
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Supplier, 'id'>) => void;
  supplier: Partial<Supplier> | null;
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
            setName(supplier.name || "");
            setContactPerson(supplier.contactPerson || "");
            setPhone(supplier.phone || "");
            setEmail(supplier.email || "");
            setAddress(supplier.address || "");
            setAmountOwed(supplier.amountOwed || 0);
            setAmountPaid(supplier.amountPaid || 0);
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
        onSave({ name, contactPerson, phone, email, address, amountOwed: Number(amountOwed), amountPaid: Number(amountPaid) });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{supplier?.id ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    <DialogDescription>
                        {supplier?.id ? 'Update the details of this supplier.' : 'Fill in the details for the new supplier.'}
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
                    <Button onClick={handleSubmit}>{supplier?.id ? 'Save Changes' : 'Create Supplier'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SupplyLogDialog({
    isOpen,
    onOpenChange,
    onSave,
    supplier,
    ingredients,
    user
} : {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (log: Omit<SupplyLog, 'id' | 'supplierName'>, user: User) => void;
    supplier: Supplier;
    ingredients: Ingredient[];
    user: User | null;
}) {
    const [ingredientId, setIngredientId] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [costPerUnit, setCostPerUnit] = useState(0);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const { toast } = useToast();

    const selectedIngredient = useMemo(() => ingredients.find(i => i.id === ingredientId), [ingredientId, ingredients]);
    
    useEffect(() => {
        if(selectedIngredient) {
            setCostPerUnit(selectedIngredient.costPerUnit || 0);
        }
    }, [selectedIngredient]);
    
    const handleSubmit = () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'User not found.'});
            return;
        }
        if (!ingredientId || !quantity || !costPerUnit) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.'});
            return;
        }
        
        const totalCost = quantity * costPerUnit;

        onSave({
            supplierId: supplier.id,
            ingredientId,
            ingredientName: selectedIngredient?.name || '',
            quantity,
            unit: selectedIngredient?.unit || '',
            costPerUnit,
            totalCost,
            date: new Date().toISOString(),
            invoiceNumber
        }, user);
        onOpenChange(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Supply Log for {supplier.name}</DialogTitle>
                    <DialogDescription>Record a new delivery of ingredients from this supplier.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="ingredient">Ingredient</Label>
                        <Select value={ingredientId} onValueChange={setIngredientId}>
                            <SelectTrigger><SelectValue placeholder="Select an ingredient"/></SelectTrigger>
                            <SelectContent>
                                {ingredients.map(ing => (
                                    <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantity Received</Label>
                        <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="costPerUnit">Cost Per Unit (₦)</Label>
                        <Input id="costPerUnit" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value))} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
                        <Input id="invoiceNumber" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Log & Update Stock</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function SupplierDetail({ supplier, onBack, user }: { supplier: Supplier, onBack: () => void, user: User | null }) {
    const { toast } = useToast();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [supplyLogs, setSupplyLogs] = useState<SupplyLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchIngredients = async () => {
            const ingredientsCollection = collection(db, "ingredients");
            const ingredientSnapshot = await getDocs(ingredientsCollection);
            setIngredients(ingredientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ingredient[]);
        };
        
        fetchIngredients();

        const logsQuery = query(collection(db, 'supply_logs'), where('supplierId', '==', supplier.id), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
            setSupplyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplyLog)));
            if (isLoading) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch supply logs." });
        });

        return () => unsubscribe();
    }, [supplier.id, toast, isLoading]);

    const filteredLogs = useMemo(() => {
        return supplyLogs.filter(log => 
            log.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [supplyLogs, searchTerm]);

    const handleSaveLog = async (logData: Omit<SupplyLog, 'id' | 'supplierName'>, user: User) => {
        try {
            const batch = writeBatch(db);

            // 1. Create new supply log
            const logRef = doc(collection(db, 'supply_logs'));
            batch.set(logRef, { ...logData, supplierName: supplier.name });
            
            // 2. Create new ingredient stock log
            const ingredientStockLogRef = doc(collection(db, 'ingredient_stock_logs'));
            batch.set(ingredientStockLogRef, {
                ingredientId: logData.ingredientId,
                ingredientName: logData.ingredientName,
                change: logData.quantity,
                reason: `Purchase from ${supplier.name}`,
                date: new Date().toISOString(),
                staffName: user.name,
            });

            // 3. Update ingredient stock
            const ingredientRef = doc(db, 'ingredients', logData.ingredientId);
            batch.update(ingredientRef, { stock: increment(logData.quantity) });

            // 4. Update supplier amount owed
            const supplierRef = doc(db, 'suppliers', supplier.id);
            batch.update(supplierRef, { amountOwed: increment(logData.totalCost) });

            await batch.commit();

            toast({ title: "Success", description: "Supply log saved and stock updated."});
            onBack(); // Go back to the main list
        } catch(error) {
            console.error("Error saving supply log:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save supply log." });
        }
    }
    
    return (
        <div className="space-y-4">
            <Button variant="outline" onClick={onBack}>&larr; Back to Suppliers</Button>
            <Card>
                <CardHeader>
                    <CardTitle>{supplier.name}</CardTitle>
                    <CardDescription>{supplier.contactPerson} - {supplier.phone}</CardDescription>
                </CardHeader>
            </Card>
            
            <SupplyLogDialog 
                isOpen={isLogDialogOpen}
                onOpenChange={setIsLogDialogOpen}
                onSave={handleSaveLog}
                supplier={supplier}
                ingredients={ingredients}
                user={user}
            />

            <Tabs defaultValue="logs">
                 <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="logs">Supply Log</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>
                     <Button onClick={() => setIsLogDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Supply Log
                    </Button>
                </div>
                <TabsContent value="logs">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Supply Log</CardTitle>
                                    <CardDescription>History of all supplies delivered by {supplier.name}.</CardDescription>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input placeholder="Search logs..." className="pl-10 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Ingredient</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                        <TableHead>Invoice #</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                    ) : filteredLogs.length > 0 ? (
                                        filteredLogs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                                                <TableCell>{log.ingredientName}</TableCell>
                                                <TableCell>{log.quantity.toFixed(2)} {log.unit}</TableCell>
                                                <TableCell>₦{log.totalCost.toFixed(2)}</TableCell>
                                                <TableCell>{log.invoiceNumber || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                         <TableRow><TableCell colSpan={5} className="h-24 text-center">No supply logs found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="details">
                     <Card>
                        <CardHeader><CardTitle>Supplier Details</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                             <p><strong>Email:</strong> {supplier.email}</p>
                             <p><strong>Address:</strong> {supplier.address}</p>
                             <p><strong>Amount Owed:</strong> ₦{supplier.amountOwed.toFixed(2)}</p>
                             <p><strong>Amount Paid:</strong> ₦{supplier.amountPaid.toFixed(2)}</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}


export default function SuppliersPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        
        const suppliersCollection = collection(db, "suppliers");
        const unsubscribe = onSnapshot(suppliersCollection, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];
            setSuppliers(list);
            if (isLoading) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching suppliers:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch suppliers." });
        });
        
        return () => unsubscribe();
    }, [toast, isLoading]);

    const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
        try {
            if (editingSupplier && editingSupplier.id) {
                const ref = doc(db, "suppliers", editingSupplier.id);
                await updateDoc(ref, supplierData);
                toast({ title: "Success", description: "Supplier updated successfully." });
            } else {
                await addDoc(collection(db, "suppliers"), supplierData);
                toast({ title: "Success", description: "Supplier created successfully." });
            }
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
        } catch (error) {
            console.error("Error deleting supplier:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete supplier." });
        } finally {
            setSupplierToDelete(null);
        }
    };
    
    const openAddDialog = () => {
        setEditingSupplier({});
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

    if (selectedSupplier) {
        return <SupplierDetail supplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} user={user} />;
    }

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
                        Manage your suppliers and their balances. Click a supplier to view logs.
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
                                    <TableRow key={supplier.id} className="cursor-pointer" onClick={() => setSelectedSupplier(supplier)}>
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
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
