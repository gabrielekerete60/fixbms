
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
import { MoreHorizontal, PlusCircle, Loader2, ChevronsUp, Calendar as CalendarIcon, ArrowDown, ArrowUp, Eye } from "lucide-react";
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, increment, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { getIngredientStockLogs, IngredientStockLog, ProductionBatch, getProductionBatch, getSupplyLog, SupplyLog } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type User = {
    name: string;
    role: string;
    staff_id: string;
};

type Ingredient = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  costPerUnit: number;
  expiryDate: string | null;
};

type Supplier = {
  id: string;
  name: string;
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

function IncreaseStockDialog({ isOpen, onOpenChange, onStockUpdated, ingredients, suppliers, user }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onStockUpdated: () => void, ingredients: Ingredient[], suppliers: Supplier[], user: User | null }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [ingredientId, setIngredientId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [quantity, setQuantity] = useState<number | string>('');
    const [costPerUnit, setCostPerUnit] = useState<number | string>('');

    const selectedIngredient = useMemo(() => ingredients.find(i => i.id === ingredientId), [ingredientId, ingredients]);
    const selectedSupplier = useMemo(() => suppliers.find(s => s.id === supplierId), [supplierId, suppliers]);

    useEffect(() => {
        if(selectedIngredient) {
            setCostPerUnit(selectedIngredient.costPerUnit || '');
        }
    }, [selectedIngredient]);

    const handleSubmit = async () => {
        if (!user || !selectedIngredient || !selectedSupplier || !quantity || !costPerUnit) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
            return;
        }

        setIsLoading(true);
        const totalCost = Number(quantity) * Number(costPerUnit);
        
        try {
            const batch = writeBatch(db);

            const logRef = doc(collection(db, 'supply_logs'));
            batch.set(logRef, {
                supplierId: selectedSupplier.id,
                supplierName: selectedSupplier.name,
                ingredientId: selectedIngredient.id,
                ingredientName: selectedIngredient.name,
                quantity: Number(quantity),
                unit: selectedIngredient.unit,
                costPerUnit: Number(costPerUnit),
                totalCost,
                date: serverTimestamp(),
                staffName: user.name,
                staffId: user.staff_id,
            });

            const ingredientRef = doc(db, 'ingredients', selectedIngredient.id);
            batch.update(ingredientRef, { stock: increment(Number(quantity)) });

            const supplierRef = doc(db, 'suppliers', selectedSupplier.id);
            batch.update(supplierRef, { amountOwed: increment(totalCost) });
            
            const ingredientStockLogRef = doc(collection(db, 'ingredient_stock_logs'));
            batch.set(ingredientStockLogRef, {
                ingredientId: selectedIngredient.id,
                ingredientName: selectedIngredient.name,
                change: Number(quantity),
                reason: `Purchase from ${selectedSupplier.name}`,
                date: serverTimestamp(),
                staffName: user.name,
                logRefId: logRef.id,
            });

            await batch.commit();
            toast({ title: 'Success', description: 'Stock updated successfully.' });
            onStockUpdated();
            onOpenChange(false);
            setIngredientId(''); setSupplierId(''); setQuantity(''); setCostPerUnit('');
        } catch (error) {
            console.error("Error increasing stock:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update stock.' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Increase Ingredient Stock</DialogTitle>
                    <DialogDescription>Record a new delivery of ingredients from a supplier. This will update inventory and the supplier's balance.</DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Ingredient</Label>
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
                        <Label>Supplier</Label>
                        <Select value={supplierId} onValueChange={setSupplierId}>
                            <SelectTrigger><SelectValue placeholder="Select a supplier"/></SelectTrigger>
                            <SelectContent>
                                {suppliers.map(sup => (
                                    <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Quantity Received</Label>
                            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                            <Label>Cost Per Unit (₦)</Label>
                            <Input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Log & Update Stock
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function LogDetailsDialog({ isOpen, onOpenChange, log, productionBatch, supplyLog }: { isOpen: boolean, onOpenChange: (open: boolean) => void, log: IngredientStockLog | null, productionBatch: ProductionBatch | null, supplyLog: SupplyLog | null }) {
    if (!isOpen || !log) return null;
  
    const isProduction = log.reason.startsWith('Production');
    const isPurchase = log.reason.startsWith('Purchase');
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Details: {log.id.substring(0, 7)}...</DialogTitle>
            <DialogDescription>
              Details for stock change on {format(new Date(log.date), 'PPp')} by {log.staffName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {isProduction && productionBatch && (
              <div>
                <h4 className="font-semibold mb-2">Production Batch: {productionBatch.id.substring(0,6)}...</h4>
                <p><strong>Product:</strong> {productionBatch.productName} (x{productionBatch.quantityToProduce})</p>
                <p><strong>Requested by:</strong> {productionBatch.requestedByName}</p>
                <Separator className="my-2" />
                <h5 className="font-medium">Ingredients Used</h5>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Ingredient</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionBatch.ingredients.map(ing => (
                      <TableRow key={ing.ingredientId}>
                        <TableCell>{ing.ingredientName}</TableCell>
                        <TableCell className="text-right">{ing.quantity} {ing.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {isPurchase && supplyLog && (
              <div>
                <h4 className="font-semibold mb-2">Purchase from: {supplyLog.supplierName}</h4>
                <p><strong>Ingredient:</strong> {supplyLog.ingredientName}</p>
                <p><strong>Quantity:</strong> {supplyLog.quantity} {supplyLog.unit}</p>
                <p><strong>Cost per Unit:</strong> ₦{supplyLog.costPerUnit.toLocaleString()}</p>
                <p><strong>Total Cost:</strong> ₦{supplyLog.totalCost.toLocaleString()}</p>
              </div>
            )}
            {!isProduction && !isPurchase && (
                <p><strong>Change:</strong> {log.change} | <strong>Reason:</strong> {log.reason}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

export default function IngredientsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stockLogs, setStockLogs] = useState<IngredientStockLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
    const [isIncreaseStockOpen, setIsIncreaseStockOpen] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>();

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<IngredientStockLog | null>(null);
    const [selectedProductionBatch, setSelectedProductionBatch] = useState<ProductionBatch | null>(null);
    const [selectedSupplyLog, setSelectedSupplyLog] = useState<SupplyLog | null>(null);
    
    const fetchPageData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [ingredientSnapshot, suppliersSnapshot, logsData] = await Promise.all([
                 getDocs(collection(db, "ingredients")),
                 getDocs(collection(db, "suppliers")),
                 getIngredientStockLogs()
            ]);
            
            setIngredients(ingredientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ingredient[]);
            setSuppliers(suppliersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Supplier)));
            setStockLogs(logsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch page data." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchPageData();
        window.addEventListener('focus', fetchPageData);
        return () => {
            window.removeEventListener('focus', fetchPageData);
        };
    }, [fetchPageData]);

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
            fetchPageData();
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
            fetchPageData();
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

    const handleViewDetails = async (log: IngredientStockLog) => {
        setSelectedLog(log);
        setSelectedProductionBatch(null);
        setSelectedSupplyLog(null);
      
        if (log.logRefId) {
          if (log.reason.startsWith('Production')) {
            const batch = await getProductionBatch(log.logRefId);
            setSelectedProductionBatch(batch);
          } else if (log.reason.startsWith('Purchase')) {
            const supplyLog = await getSupplyLog(log.logRefId);
            setSelectedSupplyLog(supplyLog);
          }
        }
        setIsDetailsOpen(true);
      };

    const ingredientsWithTotal = useMemo(() => {
        return ingredients.map(ing => ({
            ...ing,
            totalCost: (ing.stock || 0) * (ing.costPerUnit || 0),
        }))
    }, [ingredients]);
    
    const grandTotalCost = useMemo(() => {
        return ingredientsWithTotal.reduce((acc, ing) => acc + ing.totalCost, 0);
    }, [ingredientsWithTotal]);

    const filteredLogs = useMemo(() => {
        if (!date?.from) return stockLogs;
        
        const fromDate = startOfDay(date.from);
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
        
        return stockLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= fromDate && logDate <= toDate;
        });
    }, [stockLogs, date]);


    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Ingredients</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsIncreaseStockOpen(true)}>
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
            <IncreaseStockDialog
                isOpen={isIncreaseStockOpen}
                onOpenChange={setIsIncreaseStockOpen}
                onStockUpdated={fetchPageData}
                ingredients={ingredients}
                suppliers={suppliers}
                user={user}
            />
             <LogDetailsDialog 
                isOpen={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                log={selectedLog}
                productionBatch={selectedProductionBatch}
                supplyLog={selectedSupplyLog}
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
                                                <TableCell>{(ingredient.stock || 0).toFixed(2)} {ingredient.unit}</TableCell>
                                                <TableCell>₦{(ingredient.costPerUnit || 0).toFixed(2)}</TableCell>
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
                                        <TableHead>Ingredient</TableHead>
                                        <TableHead>Staff</TableHead>
                                        <TableHead>Change</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                    ) : filteredLogs.length > 0 ? (
                                        filteredLogs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>{log.date ? format(new Date(log.date), 'Pp') : 'N/A'}</TableCell>
                                                <TableCell>{log.ingredientName}</TableCell>
                                                <TableCell>{log.staffName}</TableCell>
                                                <TableCell>
                                                    <Badge variant={log.change > 0 ? "default" : "destructive"} className="gap-1">
                                                        {log.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                        {log.change}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{log.reason}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(log)} disabled={!log.logRefId}>
                                                        <Eye className="h-4 w-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No stock logs for this period.</TableCell></TableRow>
                                    )}
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
