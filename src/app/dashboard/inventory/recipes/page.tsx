

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
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Loader2, Trash2, CheckCircle, XCircle, Search, Eye, Edit, Rocket } from "lucide-react";
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collection, onSnapshot, query, orderBy, where, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startProductionBatch, approveIngredientRequest, declineProductionBatch, completeProductionBatch, ProductionBatch, ProductionLog, getRecipes, getProducts, getIngredients, getStaffByRole, getProductionBatch } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

type User = {
    name: string;
    role: string;
    staff_id: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
};

type Ingredient = {
    id: string;
    name: string;
    unit: string;
    stock: number;
    costPerUnit: number;
}

type RecipeIngredient = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  productId: string;
  productName: string;
  ingredients: RecipeIngredient[];
};

// This is a client-side helper to call the server actions for recipe CRUD
async function saveRecipe(recipeData: Omit<Recipe, 'id'>, user: User, recipeId?: string) {
    if (!user) {
        throw new Error("User not authenticated.");
    }
    
    try {
        if (recipeId) {
            await updateDoc(doc(db, "recipes", recipeId), recipeData);
            await createProductionLog('Recipe Updated', `Updated recipe: ${recipeData.name}`, user);
        } else {
            const newRecipeRef = doc(collection(db, "recipes"));
            await updateDoc(newRecipeRef, { ...recipeData, id: newRecipeRef.id });
             await createProductionLog('Recipe Created', `Created new recipe: ${recipeData.name}`, user);
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving recipe:", error);
        return { success: false, error: "Could not save recipe." };
    }
}

async function createProductionLog(action: string, details: string, user: User) {
    await addDoc(collection(db, "production_logs"), {
        action,
        details,
        staffId: user.staff_id,
        staffName: user.name,
        timestamp: new Date()
    });
}


function RecipeDialog({
  isOpen,
  onOpenChange,
  recipe,
  products,
  ingredients: allIngredients,
  user
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Partial<Recipe> | null;
  products: Product[];
  ingredients: Ingredient[];
  user: User;
}) {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

    useEffect(() => {
        if (recipe) {
            setName(recipe.name || "");
            setDescription(recipe.description || "");
            setSelectedProductId(recipe.productId || "");
            setRecipeIngredients(recipe.ingredients || []);
        } else {
            setName("");
            setDescription("");
            setSelectedProductId("");
            setRecipeIngredients([]);
        }
    }, [recipe]);

    const handleAddIngredient = () => {
        setRecipeIngredients([...recipeIngredients, { ingredientId: '', ingredientName: '', quantity: 1, unit: 'g' }]);
    };

    const handleRemoveIngredient = (index: number) => {
        setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
    };

    const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: string | number) => {
        const newIngredients = [...recipeIngredients];
        if (field === 'ingredientId') {
            const ingredient = allIngredients.find(i => i.id === value);
            newIngredients[index].ingredientId = value as string;
            newIngredients[index].ingredientName = ingredient?.name || '';
            newIngredients[index].unit = ingredient?.unit || '';
        } else if (field === 'quantity') {
            newIngredients[index].quantity = Number(value);
        } else {
            newIngredients[index][field as 'unit' | 'ingredientName'] = value as string;
        }
        setRecipeIngredients(newIngredients);
    };

    const handleSubmit = async () => {
        if (!name || !selectedProductId || recipeIngredients.some(i => !i.ingredientId)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Recipe name, product, and all ingredients must be filled.' });
            return;
        }
        const selectedProduct = products.find(p => p.id === selectedProductId);
        if (!user) return;

        const result = await saveRecipe({ 
            name, 
            description, 
            productId: selectedProductId,
            productName: selectedProduct?.name || '',
            ingredients: recipeIngredients,
        }, user, recipe?.id);

        if (result.success) {
            toast({ title: "Success", description: "Recipe saved successfully." });
            onOpenChange(false);
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{recipe?.id ? 'Edit Recipe' : 'Add New Recipe'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Recipe Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="product">Product</Label>
                         <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger><SelectValue placeholder="Select product this recipe makes" /></SelectTrigger>
                            <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div>
                        <Label className="mb-2 block">Ingredients</Label>
                        <div className="space-y-3">
                            {recipeIngredients.map((ing, index) => (
                                <div key={index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-center">
                                    <Select value={ing.ingredientId} onValueChange={(val) => handleIngredientChange(index, 'ingredientId', val)}>
                                        <SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                                        <SelectContent>
                                            {allIngredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" placeholder="Qty" value={ing.quantity} onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)} />
                                    <Input placeholder="Unit" value={ing.unit} readOnly />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveIngredient(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="mt-4" onClick={handleAddIngredient}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
                        </Button>
                    </div>
                </div>
                <DialogFooter className="justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{recipe?.id ? 'Save Changes' : 'Create Recipe'}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CompleteBatchDialog({ batch, user, onBatchCompleted }: { batch: ProductionBatch, user: User, onBatchCompleted: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [storekeepers, setStorekeepers] = useState<any[]>([]);
    const [successfullyProduced, setSuccessfullyProduced] = useState<number | string>(batch.quantityToProduce);
    const [wasted, setWasted] = useState<number | string>(0);
    
    useEffect(() => {
        if (isOpen) {
            const fetchStorekeepers = async () => {
                const staff = await getStaffByRole('Storekeeper');
                setStorekeepers(staff);
            };
            fetchStorekeepers();
            setSuccessfullyProduced(batch.quantityToProduce);
            setWasted(0);
        }
    }, [isOpen, batch.quantityToProduce]);

    const handleProducedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setSuccessfullyProduced('');
            return;
        }

        let produced = Number(value);
        if (isNaN(produced) || produced < 0) {
             setSuccessfullyProduced(0);
             return;
        }

        if (produced > batch.quantityToProduce) {
            produced = batch.quantityToProduce;
            toast({ variant: 'destructive', title: 'Error', description: `Cannot produce more than the requested quantity of ${batch.quantityToProduce}.` });
        }

        setSuccessfullyProduced(produced);
        const wastedQty = batch.quantityToProduce - produced;
        if (!isNaN(wastedQty) && wastedQty >= 0) {
            setWasted(wastedQty);
        }
    };

    const handleWastedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
         if (value === '') {
            setWasted('');
            return;
        }

        let wastedQty = Number(value);
        if (isNaN(wastedQty) || wastedQty < 0) {
            setWasted(0);
            return;
        }
        
        if (wastedQty > batch.quantityToProduce) {
            wastedQty = batch.quantityToProduce;
             toast({ variant: 'destructive', title: 'Error', description: `Cannot waste more than the requested quantity of ${batch.quantityToProduce}.` });
        }

        setWasted(wastedQty);
        const produced = batch.quantityToProduce - wastedQty;
        if (!isNaN(produced) && produced >= 0) {
            setSuccessfullyProduced(produced);
        }
    };


    const handleComplete = async () => {
        if (!storekeepers.length) {
            toast({ variant: 'destructive', title: 'Error', description: 'No Storekeeper found to transfer stock to. Please add a staff member with the "Storekeeper" role.' });
            return;
        }

        const produced = Number(successfullyProduced);
        const wastedQty = Number(wasted);
        if (isNaN(produced) || isNaN(wastedQty) || produced < 0 || wastedQty < 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter valid numbers for produced and wasted quantities.'});
            return;
        }
        if ((produced + wastedQty) > batch.quantityToProduce) {
            toast({ variant: 'destructive', title: 'Error', description: 'Produced + Wasted cannot be greater than the quantity requested.'});
            return;
        }

        setIsLoading(true);
        if(!user) return;
        const result = await completeProductionBatch({
            batchId: batch.id,
            productId: batch.productId,
            productName: batch.productName,
            successfullyProduced: produced,
            wasted: wastedQty,
            storekeeperId: storekeepers[0].id // Assuming first storekeeper
        }, user);

        if (result.success) {
            toast({ title: 'Success', description: 'Production batch completed and sent for acknowledgement.' });
            onBatchCompleted();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm">Complete Batch</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Production Batch</DialogTitle>
                    <DialogDescription>
                        Enter the final counts for <strong>{batch.quantityToProduce} x {batch.productName}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                             <Label htmlFor="produced">Successfully Produced</Label>
                             <Input id="produced" type="number" value={successfullyProduced} onChange={handleProducedChange} />
                        </div>
                        <div className="grid gap-2">
                             <Label htmlFor="wasted">Wasted / Damaged</Label>
                             <Input id="wasted" type="number" value={wasted} onChange={handleWastedChange} />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Completed items will be sent to the main store for acknowledgement. Wasted items will be logged.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleComplete} disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Complete Batch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ProductionLogDetailsDialog({ log, isOpen, onOpenChange, user }: { log: ProductionLog | null, isOpen: boolean, onOpenChange: (open: boolean) => void, user: User | null }) {
    const [batchDetails, setBatchDetails] = useState<ProductionBatch | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setBatchDetails(null);
            if (isOpen && log && log.action.includes('Batch') && log.details) {
                const batchIdMatch = log.details.match(/\b([a-zA-Z0-9]{20})\b/);
                const batchId = batchIdMatch ? batchIdMatch[0] : log.details.split(' ').pop();
                
                if (batchId) {
                    try {
                        const batch = await getProductionBatch(batchId);
                        setBatchDetails(batch);
                    } catch (error) {
                        console.error(`Could not fetch details for batch ${batchId}`, error)
                    }
                }
            }
        };
        fetchDetails();
    }, [isOpen, log]);
    
    if (!log || !isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Details</DialogTitle>
          <DialogDescription>
            Detailed information for log entry on {log.timestamp ? format(new Date(log.timestamp), 'PPp') : 'N/A'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-2"><strong>Action:</strong> <Badge>{log.action}</Badge></div>
            <p><strong>Staff Member:</strong> {log.staffName}</p>
            <p><strong>Details:</strong> {log.details}</p>
            {batchDetails && user.role !== 'Baker' && (
                 <>
                    <Separator className="my-4"/>
                    <h4 className="font-semibold text-base">Production Batch Details</h4>
                    <p><strong>Product:</strong> {batchDetails.productName} (x{batchDetails.quantityToProduce})</p>
                    <p><strong>Requested by:</strong> {batchDetails.requestedByName}</p>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead className="text-right">Available Before Prod</TableHead>
                            <TableHead className="text-right">Used</TableHead>
                            <TableHead className="text-right">Available After Prod</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {batchDetails.ingredients.map(ing => (
                                <TableRow key={ing.ingredientId}>
                                    <TableCell>{ing.ingredientName}</TableCell>
                                    <TableCell className="text-right">{((ing.openingStock || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {ing.unit}</TableCell>
                                    <TableCell className="text-right text-red-500">- {ing.quantity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {ing.unit}</TableCell>
                                    <TableCell className="text-right text-green-600 font-medium">{((ing.closingStock || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {ing.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartProductionDialog({
    isOpen,
    onOpenChange,
    recipe,
    user
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    recipe: Recipe | null;
    user: User | null;
}) {
    const { toast } = useToast();
    const [quantity, setQuantity] = useState<number | string>(1);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
        }
    }, [isOpen]);

    const handleStartProduction = async () => {
        if (!recipe || !user || !quantity || Number(quantity) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid input', description: 'Please enter a valid quantity.' });
            return;
        }
        
        setIsLoading(true);

        const batchData = {
            recipeId: recipe.id,
            recipeName: recipe.name,
            productId: recipe.productId,
            productName: recipe.productName,
            requestedById: user.staff_id,
            requestedByName: user.name,
            quantityToProduce: Number(quantity),
            ingredients: recipe.ingredients,
        };
        
        const result = await startProductionBatch(batchData, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Production batch requested for approval.'});
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error});
        }
        setIsLoading(false);
    }

    if (!recipe) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Start Production: {recipe.name}</DialogTitle>
                    <DialogDescription>
                        Enter the quantity of "{recipe.productName}" you want to produce. This will send an ingredient request to the storekeeper.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4">
                    <Label htmlFor="quantity-to-produce">Quantity to Produce</Label>
                    <Input 
                        id="quantity-to-produce"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="1"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleStartProduction} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Request Ingredients
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function RecipesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    
    // Real-time states
    const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
    const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
    const [recipeToProduce, setRecipeToProduce] = useState<Recipe | null>(null);
    const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
    const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    const [viewingLog, setViewingLog] = useState<ProductionLog | null>(null);
    
    const [logActionFilter, setLogActionFilter] = useState('all');
    const [logStaffFilter, setLogStaffFilter] = useState('all');

    const fetchStaticData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [recipeData, productData, ingredientData] = await Promise.all([
                getRecipes(),
                getProducts(),
                getIngredients(),
            ]);

            setRecipes(recipeData.map((r: any) => ({ ...r, ingredients: r.ingredients || [] })));
            setProducts(productData);
            setIngredients(ingredientData);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch static data." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchStaticData();
    }, [fetchStaticData]);
    
    // Real-time listeners
    useEffect(() => {
        const qBatches = query(collection(db, 'production_batches'), where('status', 'in', ['pending_approval', 'in_production']));
        const unsubBatches = onSnapshot(qBatches, (snapshot) => {
            setProductionBatches(snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt.toDate().toISOString(),
                    approvedAt: data.approvedAt ? (data.approvedAt)?.toDate().toISOString() : null
                } as ProductionBatch
            }));
        });

        const qLogs = query(collection(db, 'production_logs'), orderBy('timestamp', 'desc'));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
             const logs = snapshot.docs.map(doc => {
                 const data = doc.data();
                 const timestamp = (data.timestamp as any)?.toDate ? (data.timestamp as any).toDate().toISOString() : data.timestamp;
                 return {
                    id: doc.id,
                    ...data,
                    timestamp,
                } as ProductionLog
             });
            setProductionLogs(logs);
        });
        
        const qRecipes = query(collection(db, "recipes"));
        const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
             setRecipes(snapshot.docs.map((r: any) => ({ ...r.data(), id: r.id, ingredients: r.data().ingredients || [] })));
        });

        return () => {
            unsubBatches();
            unsubLogs();
            unsubRecipes();
        }
    }, []);

    const handleDelete = async () => {
        if (!recipeToDelete || !user) return;
        try {
            await deleteDoc(doc(db, "recipes", recipeToDelete.id));
            await createProductionLog('Recipe Deleted', `Deleted recipe: ${recipeToDelete.name}`, user);
            toast({ title: "Success", description: "Recipe deleted successfully." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete recipe." });
        }
        setRecipeToDelete(null);
    };

    const openAddDialog = () => {
        setEditingRecipe({});
        setIsRecipeDialogOpen(true);
    };

    const openEditDialog = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setIsRecipeDialogOpen(true);
    };
    
    const openProductionDialog = (recipe: Recipe) => {
        setRecipeToProduce(recipe);
        setIsProductionDialogOpen(true);
    };

    const logStaffMembers = useMemo(() => ['all', ...new Set(productionLogs.map(log => log.staffName))], [productionLogs]);
    const logActionTypes = useMemo(() => ['all', ...new Set(productionLogs.map(log => log.action))], [productionLogs]);

    const filteredLogs = useMemo(() => {
        return productionLogs.filter(log => {
            const staffMatch = logStaffFilter === 'all' || log.staffName === logStaffFilter;
            const actionMatch = logActionFilter === 'all' || log.action === logActionFilter;
            return staffMatch && actionMatch;
        });
    }, [productionLogs, logStaffFilter, logActionFilter]);
    
    if (!user) {
         return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    const canManageRecipes = user.role === 'Manager' || user.role === 'Developer';
    const canApproveBatches = user.role === 'Manager' || user.role === 'Developer' || user.role === 'Storekeeper';

    const getStatusVariant = (status: string) => {
        switch(status) {
            case 'pending_approval': return 'destructive';
            case 'in_production': return 'default';
            default: return 'secondary';
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Recipes &amp; Production</h1>
                 {canManageRecipes && (
                    <Button onClick={openAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Recipe
                    </Button>
                )}
            </div>

            {isRecipeDialogOpen && (
                <RecipeDialog
                    isOpen={isRecipeDialogOpen}
                    onOpenChange={setIsRecipeDialogOpen}
                    recipe={editingRecipe}
                    products={products}
                    ingredients={ingredients}
                    user={user}
                />
            )}
            <StartProductionDialog
                isOpen={isProductionDialogOpen}
                onOpenChange={setIsProductionDialogOpen}
                recipe={recipeToProduce}
                user={user}
            />
             <ProductionLogDetailsDialog 
                log={viewingLog}
                isOpen={!!viewingLog}
                onOpenChange={() => setViewingLog(null)}
                user={user}
            />
            
            <Tabs defaultValue="recipes">
                <TabsList>
                    <TabsTrigger value="recipes">Recipes</TabsTrigger>
                    <TabsTrigger value="production" className="relative">
                        Production Batches
                        {productionBatches.length > 0 && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                                {productionBatches.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="logs">Production Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="recipes">
                     <Card>
                        <CardHeader>
                            <CardTitle>All Recipes</CardTitle>
                            <CardDescription>Manage your product recipes and their ingredients. Bakers can start production from here.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Recipe Name</TableHead>
                                        <TableHead>Creates Product</TableHead>
                                        <TableHead>No. of Ingredients</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipes.map(recipe => (
                                        <TableRow key={recipe.id}>
                                            <TableCell className="font-medium">{recipe.name}</TableCell>
                                            <TableCell>{recipe.productName}</TableCell>
                                            <TableCell>{recipe.ingredients?.length || 0}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => openProductionDialog(recipe)}><Rocket className="mr-2 h-4 w-4"/>Start Production</DropdownMenuItem>
                                                        {canManageRecipes && (
                                                            <>
                                                                <DropdownMenuItem onSelect={() => openEditDialog(recipe)}><Edit className="mr-2 h-4 w-4"/>Edit Recipe</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive" onSelect={() => setRecipeToDelete(recipe)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="production">
                     <Card>
                        <CardHeader>
                            <CardTitle>Active Production Batches</CardTitle>
                            <CardDescription>Batches that are pending approval or are currently being produced.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Time Started</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Requested By</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {productionBatches.length > 0 ? productionBatches.map(batch => (
                                        <TableRow key={batch.id}>
                                            <TableCell>{batch.approvedAt ? format(new Date(batch.approvedAt), 'Pp') : format(new Date(batch.createdAt), 'Pp')}</TableCell>
                                            <TableCell>{batch.productName}</TableCell>
                                            <TableCell>{batch.quantityToProduce}</TableCell>
                                            <TableCell>{batch.requestedByName}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(batch.status)}>{batch.status.replace('_', ' ')}</Badge></TableCell>
                                            <TableCell>
                                                {batch.status === 'pending_approval' && canApproveBatches && (
                                                    <ApproveBatchDialog batch={batch} user={user} allIngredients={ingredients} onApproval={fetchStaticData} />
                                                )}
                                                {batch.status === 'in_production' && (
                                                    <CompleteBatchDialog batch={batch} user={user} onBatchCompleted={fetchStaticData} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={6} className="text-center h-24">No active batches.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="logs">
                     <Card>
                        <CardHeader>
                            <CardTitle>Production Logs</CardTitle>
                             <div className="flex items-center justify-between gap-4 pt-4">
                                <CardDescription>A complete audit trail of all recipe and production activities.</CardDescription>
                                <div className="flex items-center gap-2">
                                     <Select value={logStaffFilter} onValueChange={setLogStaffFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filter by staff" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {logStaffMembers.map(staff => (
                                                <SelectItem key={staff} value={staff} className="capitalize">{staff}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filter by action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {logActionTypes.map(action => (
                                                <SelectItem key={action} value={action}>{action}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Staff</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>View</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.timestamp ? format(new Date(log.timestamp), 'Pp') : 'N/A'}</TableCell>
                                            <TableCell>{log.staffName}</TableCell>
                                            <TableCell><Badge>{log.action}</Badge></TableCell>
                                            <TableCell className="max-w-[300px] truncate">{log.details}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => setViewingLog(log)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No production logs found for this filter.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
           

            <AlertDialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the recipe "{recipeToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
