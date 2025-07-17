
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type OtherSupply = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  costPerUnit: number;
  category: string;
};

function SupplyDialog({
  isOpen,
  onOpenChange,
  onSave,
  supply
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<OtherSupply, 'id'>) => void;
  supply: Partial<OtherSupply> | null;
}) {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [stock, setStock] = useState(0);
    const [unit, setUnit] = useState("");
    const [costPerUnit, setCostPerUnit] = useState(0);
    const [category, setCategory] = useState("Packaging");

    useEffect(() => {
        if (supply) {
            setName(supply.name || "");
            setStock(supply.stock || 0);
            setUnit(supply.unit || "");
            setCostPerUnit(supply.costPerUnit || 0);
            setCategory(supply.category || "Packaging");
        } else {
            setName("");
            setStock(0);
            setUnit("");
            setCostPerUnit(0);
            setCategory("Packaging");
        }
    }, [supply]);

    const handleSubmit = () => {
        if (!name || !unit || !category) {
            toast({ variant: 'destructive', title: 'Error', description: 'Supply name, unit, and category are required.' });
            return;
        }
        onSave({ 
            name, 
            stock: Number(stock), 
            unit, 
            costPerUnit: Number(costPerUnit), 
            category
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{supply?.id ? 'Edit Supply' : 'Add New Supply'}</DialogTitle>
                    <DialogDescription>
                        {supply?.id ? 'Update the details of this supply item.' : 'Fill in the details for the new supply item.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Stock</Label>
                        <Input id="stock" type="number" value={stock} onChange={(e) => setStock(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">Unit</Label>
                        <Input id="unit" placeholder="e.g., pcs, L, rolls" value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPerUnit" className="text-right">Cost/Unit (₦)</Label>
                        <Input id="costPerUnit" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Packaging">Packaging</SelectItem>
                                <SelectItem value="Cleaning">Cleaning</SelectItem>
                                <SelectItem value="Production">Production</SelectItem>
                                <SelectItem value="Office">Office</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>{supply?.id ? 'Save Changes' : 'Create Supply'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function OtherSuppliesPage() {
    const { toast } = useToast();
    const [supplies, setSupplies] = useState<OtherSupply[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSupply, setEditingSupply] = useState<Partial<OtherSupply> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [supplyToDelete, setSupplyToDelete] = useState<OtherSupply | null>(null);

    const fetchSupplies = useCallback(async () => {
        setIsLoading(true);
        try {
            const suppliesCollection = collection(db, "other_supplies");
            const snapshot = await getDocs(suppliesCollection);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OtherSupply[];
            setSupplies(list);
        } catch (error) {
            console.error("Error fetching supplies:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch supplies." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSupplies();
        window.addEventListener('focus', fetchSupplies);
        return () => {
            window.removeEventListener('focus', fetchSupplies);
        };
    }, [fetchSupplies]);

    const handleSaveSupply = async (supplyData: Omit<OtherSupply, 'id'>) => {
        try {
            if (editingSupply && editingSupply.id) {
                const ref = doc(db, "other_supplies", editingSupply.id);
                await updateDoc(ref, supplyData);
                toast({ title: "Success", description: "Supply updated successfully." });
            } else {
                await addDoc(collection(db, "other_supplies"), supplyData);
                toast({ title: "Success", description: "Supply created successfully." });
            }
            fetchSupplies();
        } catch (error) {
            console.error("Error saving supply:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save supply." });
        }
    };

    const handleDeleteSupply = async () => {
        if (!supplyToDelete) return;
        try {
            await deleteDoc(doc(db, "other_supplies", supplyToDelete.id));
            toast({ title: "Success", description: "Supply deleted successfully." });
            fetchSupplies();
        } catch (error) {
            console.error("Error deleting supply:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete supply." });
        } finally {
            setSupplyToDelete(null);
        }
    };
    
    const openAddDialog = () => {
        setEditingSupply({});
        setIsDialogOpen(true);
    };

    const openEditDialog = (supply: OtherSupply) => {
        setEditingSupply(supply);
        setIsDialogOpen(true);
    };
    
    const grandTotalCost = useMemo(() => {
        return supplies.reduce((acc, supply) => acc + (supply.stock * supply.costPerUnit), 0);
    }, [supplies]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Other Supplies</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={openAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Supply
                    </Button>
                </div>
            </div>

            <SupplyDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveSupply}
                supply={editingSupply}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Manage Other Supplies</CardTitle>
                    <CardDescription>
                        A list of all non-ingredient supplies for your bakery.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supply Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Cost/Unit</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : supplies.length > 0 ? (
                                supplies.map(supply => (
                                    <TableRow key={supply.id}>
                                        <TableCell className="font-medium">{supply.name}</TableCell>
                                        <TableCell>{supply.category}</TableCell>
                                        <TableCell>{supply.stock.toFixed(2)} {supply.unit}</TableCell>
                                        <TableCell>₦{supply.costPerUnit.toFixed(2)}</TableCell>
                                        <TableCell>₦{(supply.stock * supply.costPerUnit).toFixed(2)}</TableCell>
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
                                                    <DropdownMenuItem onSelect={() => openEditDialog(supply)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setSupplyToDelete(supply)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No supplies found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="font-bold text-right">Grand Total</TableCell>
                                <TableCell className="font-bold">₦{grandTotalCost.toFixed(2)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!supplyToDelete} onOpenChange={(open) => !open && setSupplyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the supply "{supplyToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSupply}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
