
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
import { MoreHorizontal, PlusCircle, Loader2, ChevronsUp, Calendar as CalendarIcon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";


type Ingredient = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  costPerUnit: number;
  expiryDate: string | null;
};

function IngredientDialog({
  isOpen,
  onOpenChange,
  onSave,
  ingredient
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Omit<Ingredient, 'id' | 'stock'>>) => void;
  ingredient: Partial<Ingredient> | null;
}) {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");
    const [costPerUnit, setCostPerUnit] = useState(0);
    const [expiryDate, setExpiryDate] = useState<Date | undefined>();

    useEffect(() => {
        if (ingredient) {
            setName(ingredient.name || "");
            setUnit(ingredient.unit || "");
            setCostPerUnit(ingredient.costPerUnit || 0);
            setExpiryDate(ingredient.expiryDate ? new Date(ingredient.expiryDate) : undefined);
        } else {
            setName("");
            setUnit("");
            setCostPerUnit(0);
            setExpiryDate(undefined);
        }
    }, [ingredient]);

    const handleSubmit = () => {
        if (!name || !unit) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ingredient name and unit are required.' });
            return;
        }
        onSave({ 
            name,
            unit, 
            costPerUnit: Number(costPerUnit), 
            expiryDate: expiryDate ? expiryDate.toISOString() : null 
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{ingredient?.id ? 'Edit Ingredient' : 'Add New Ingredient'}</DialogTitle>
                    <DialogDescription>
                        {ingredient?.id ? 'Update the details of this ingredient.' : 'Fill in the details for the new ingredient.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">Unit</Label>
                        <Input id="unit" placeholder="e.g., kg, L, pcs" value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPerUnit" className="text-right">Cost/Unit (₦)</Label>
                        <Input id="costPerUnit" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Expiry Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "col-span-3 justify-start text-left font-normal",
                                !expiryDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date (optional)</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={expiryDate}
                                onSelect={setExpiryDate}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>{ingredient?.id ? 'Save Changes' : 'Create Ingredient'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function IngredientsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
    const [date, setDate] = useState<DateRange | undefined>();

    const fetchIngredients = useCallback(async () => {
        setIsLoading(true);
        try {
            const ingredientsCollection = collection(db, "ingredients");
            const snapshot = await getDocs(ingredientsCollection);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ingredient[];
            setIngredients(list);
        } catch (error) {
            console.error("Error fetching ingredients:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch ingredients." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchIngredients();
        window.addEventListener('focus', fetchIngredients);
        return () => {
            window.removeEventListener('focus', fetchIngredients);
        };
    }, [fetchIngredients]);

    const handleSaveIngredient = async (ingredientData: Partial<Omit<Ingredient, 'id' | 'stock'>>) => {
        try {
            if (editingIngredient && editingIngredient.id) {
                const ref = doc(db, "ingredients", editingIngredient.id);
                await updateDoc(ref, ingredientData);
                toast({ title: "Success", description: "Ingredient updated successfully." });
            } else {
                const dataToSave = { ...ingredientData, stock: 0 }; // New ingredients start with 0 stock
                await addDoc(collection(db, "ingredients"), dataToSave);
                toast({ title: "Success", description: "Ingredient created successfully." });
            }
            fetchIngredients();
        } catch (error) {
            console.error("Error saving ingredient:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save ingredient." });
        }
    };

    const handleDeleteIngredient = async () => {
        if (!ingredientToDelete) return;
        try {
            await deleteDoc(doc(db, "ingredients", ingredientToDelete.id));
            toast({ title: "Success", description: "Ingredient deleted successfully." });
            fetchIngredients();
        } catch (error) {
            console.error("Error deleting ingredient:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete ingredient." });
        } finally {
            setIngredientToDelete(null);
        }
    };
    
    const openAddDialog = () => {
        setEditingIngredient({});
        setIsDialogOpen(true);
    };

    const openEditDialog = (ingredient: Ingredient) => {
        setEditingIngredient(ingredient);
        setIsDialogOpen(true);
    };

    const ingredientsWithTotal = useMemo(() => {
        return ingredients.map(ing => ({
            ...ing,
            totalCost: ing.stock * ing.costPerUnit,
        }))
    }, [ingredients]);
    
    const grandTotalCost = useMemo(() => {
        return ingredientsWithTotal.reduce((acc, ing) => acc + ing.totalCost, 0);
    }, [ingredientsWithTotal]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Ingredients</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/dashboard/inventory/suppliers')}>
                        <ChevronsUp className="mr-2 h-4 w-4" /> Increase Stock
                    </Button>
                    <Button onClick={openAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
                    </Button>
                </div>
            </div>

            <IngredientDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveIngredient}
                ingredient={editingIngredient}
            />
            
            <Tabs defaultValue="current-stock">
                <TabsList>
                    <TabsTrigger value="current-stock">Current Stock</TabsTrigger>
                    <TabsTrigger value="stock-logs">Stock Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="current-stock">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Ingredients</CardTitle>
                            <CardDescription>
                                A list of all ingredients for your bakery's recipes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingredient</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Cost/Unit</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                        <TableHead>Expiry</TableHead>
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
                                    ) : ingredientsWithTotal.length > 0 ? (
                                        ingredientsWithTotal.map(ingredient => (
                                            <TableRow key={ingredient.id}>
                                                <TableCell className="font-medium">{ingredient.name}</TableCell>
                                                <TableCell>{ingredient.stock.toFixed(3)} {ingredient.unit}</TableCell>
                                                <TableCell>₦{ingredient.costPerUnit.toFixed(2)}</TableCell>
                                                <TableCell>₦{ingredient.totalCost.toFixed(2)}</TableCell>
                                                <TableCell>{ingredient.expiryDate ? new Date(ingredient.expiryDate).toLocaleDateString() : 'N/A'}</TableCell>
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
                                                            <DropdownMenuItem onSelect={() => openEditDialog(ingredient)}>Edit</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onSelect={() => setIngredientToDelete(ingredient)}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                No ingredients found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={3} className="font-bold text-right">Grand Total</TableCell>
                                        <TableCell className="font-bold">₦{grandTotalCost.toFixed(2)}</TableCell>
                                        <TableCell colSpan={2}></TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="stock-logs">
                    <Card>
                        <CardHeader>
                             <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Ingredient Stock Logs</CardTitle>
                                    <CardDescription>A history of all stock movements.</CardDescription>
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
                                        <TableHead>Ingredient / Recipe</TableHead>
                                        <TableHead>Change</TableHead>
                                        <TableHead>New Level</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Stock log functionality is coming soon.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!ingredientToDelete} onOpenChange={(open) => !open && setIngredientToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the ingredient "{ingredientToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteIngredient}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
