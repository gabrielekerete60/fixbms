
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2, Beaker, Hourglass, Check, X, ShieldCheck, AlertCircle } from "lucide-react";
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startProductionBatch, getProductionBatches, approveIngredientRequest, completeProductionBatch } from "@/app/actions";
import type { ProductionBatch } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    stock: number;
    costPerUnit: number;
    unit: string;
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

function RecipeDialog({
  isOpen,
  onOpenChange,
  onSave,
  recipe,
  products,
  ingredients: allIngredients
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Recipe, 'id'>) => void;
  recipe: Recipe | null;
  products: Product[];
  ingredients: Ingredient[];
}) {
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

    const availableProducts = useMemo(() => products.filter(p => p.category.toLowerCase() !== 'drinks'), [products]);

    useEffect(() => {
        if (recipe) {
            setName(recipe.name);
            setDescription(recipe.description);
            setSelectedProductId(recipe.productId);
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
        } else if (field === 'quantity') {
            newIngredients[index].quantity = Number(value);
        } else {
            newIngredients[index][field] = value as string;
        }
        setRecipeIngredients(newIngredients);
    };

    const handleSubmit = () => {
        if (!name || !selectedProductId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Recipe name and product are required.' });
            return;
        }
        if (recipeIngredients.some(i => !i.ingredientId || !i.quantity || !i.unit)) {
             toast({ variant: 'destructive', title: 'Error', description: 'All ingredient fields must be filled.' });
            return;
        }
        const selectedProduct = products.find(p => p.id === selectedProductId);

        onSave({ 
            name, 
            description, 
            productId: selectedProductId,
            productName: selectedProduct?.name || '',
            ingredients: recipeIngredients,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{recipe ? 'Edit Recipe' : 'Add New Recipe'}</DialogTitle>
                    <DialogDescription>
                        {recipe ? 'Update the details of this recipe.' : 'Fill in the details for the new recipe.'}
                    </DialogDescription>
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
                                {availableProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                                    <Input placeholder="Unit (g, kg, ml)" value={ing.unit} onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)} />
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
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>{recipe ? 'Save Changes' : 'Create Recipe'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StartBatchDialog({ recipe, user, onStarted, children }: { recipe: Recipe, user: User, onStarted: () => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [quantity, setQuantity] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!quantity || quantity <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid quantity.' });
            return;
        }
        setIsSubmitting(true);
        const result = await startProductionBatch({
            recipeId: recipe.id,
            recipeName: recipe.name,
            productId: recipe.productId,
            productName: recipe.productName,
            requestedById: user.staff_id,
            requestedByName: user.name,
            quantityToProduce: quantity,
            ingredients: recipe.ingredients,
        });

        if (result.success) {
            toast({ title: 'Success', description: 'Batch sent for ingredient approval.' });
            onStarted();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Start Production Batch</DialogTitle>
                    <DialogDescription>How many units of <span className="font-bold">{recipe.productName}</span> do you want to produce?</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="quantity">Quantity to Produce</Label>
                    <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Request Ingredients
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CompleteBatchDialog({ batch, user, onCompleted }: { batch: ProductionBatch, user: User, onCompleted: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [successfullyProduced, setSuccessfullyProduced] = useState<number | string>(batch.quantityToProduce);
    const [wasted, setWasted] = useState<number | string>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSuccessChange = (value: number) => {
        if (value > batch.quantityToProduce) value = batch.quantityToProduce;
        if (value < 0) value = 0;
        setSuccessfullyProduced(value);
        setWasted(batch.quantityToProduce - value);
    }
    
    const handleWastedChange = (value: number) => {
        if (value > batch.quantityToProduce) value = batch.quantityToProduce;
        if (value < 0) value = 0;
        setWasted(value);
        setSuccessfullyProduced(batch.quantityToProduce - value);
    }

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const storekeeperId = "700008"; 

        const result = await completeProductionBatch({
            batchId: batch.id,
            productId: batch.productId,
            productName: batch.productName,
            successfullyProduced: Number(successfullyProduced),
            wasted: Number(wasted),
            storekeeperId,
        }, user);

        if (result.success) {
            toast({ title: 'Success', description: 'Batch completed and sent for stock reconciliation.' });
            onCompleted();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm" variant="secondary">Complete Batch</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Production Batch: {batch.recipeName}</DialogTitle>
                    <DialogDescription>
                        Reconcile the items from the initial quantity of <span className="font-bold">{batch.quantityToProduce}</span>.
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="successful">Successfully Produced</Label>
                        <Input id="successful" type="number" value={successfullyProduced} onChange={e => handleSuccessChange(Number(e.target.value))} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="wasted">Wasted Items</Label>
                        <Input id="wasted" type="number" value={wasted} onChange={e => handleWastedChange(Number(e.target.value))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm and Update Stock
                    </Button>
                </DialogFooter>
            </DialogContent>
    )
}

function ApproveBatchDialog({ batch, allIngredients, onApproved, onDeclined, children }: { batch: ProductionBatch, allIngredients: Ingredient[], onApproved: () => void, onDeclined: () => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationResults, setValidationResults] = useState<{ ingredientId: string, name: string, required: number, available: number, hasEnough: boolean }[]>([]);

    const totalRequiredIngredients = useMemo(() => {
        const requiredMap = new Map<string, number>();
        batch.ingredients.forEach(ing => {
            const total = ing.quantity * batch.quantityToProduce;
            requiredMap.set(ing.ingredientId, (requiredMap.get(ing.ingredientId) || 0) + total);
        });
        return Array.from(requiredMap.entries()).map(([id, qty]) => ({ ingredientId: id, quantity: qty }));
    }, [batch]);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            const ingredientMap = new Map(allIngredients.map(i => [i.id, i]));
            const validation = totalRequiredIngredients.map(req => {
                const stockItem = ingredientMap.get(req.ingredientId);
                const available = stockItem?.stock || 0;
                return {
                    ingredientId: req.ingredientId,
                    name: stockItem?.name || 'Unknown Ingredient',
                    required: req.quantity,
                    available: available,
                    hasEnough: available >= req.quantity,
                };
            });
            setValidationResults(validation);
            setIsLoading(false);
        }
    }, [isOpen, allIngredients, totalRequiredIngredients]);

    const canApprove = useMemo(() => validationResults.every(v => v.hasEnough), [validationResults]);
    const shortages = useMemo(() => validationResults.filter(v => !v.hasEnough), [validationResults]);

    const handleApprove = async () => {
        if (!canApprove) {
            toast({ variant: 'destructive', title: 'Cannot Approve', description: 'Not enough ingredients in stock.' });
            return;
        }
        setIsSubmitting(true);
        const result = await approveIngredientRequest(batch.id, totalRequiredIngredients);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch approved and moved to production.' });
            onApproved();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Approve Batch: {batch.recipeName}</DialogTitle>
                    <DialogDescription>Verify ingredient stock and approve the request to begin production.</DialogDescription>
                </DialogHeader>
                <div className="py-2 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                        <>
                        {!canApprove && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Stock Shortage</AlertTitle>
                                <AlertDescription>
                                    Cannot approve. The following ingredients are low: {shortages.map(s => s.name).join(', ')}.
                                </AlertDescription>
                            </Alert>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ingredient</TableHead>
                                    <TableHead className="text-right">Required</TableHead>
                                    <TableHead className="text-right">Available</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {validationResults.map(val => (
                                    <TableRow key={val.ingredientId}>
                                        <TableCell>{val.name}</TableCell>
                                        <TableCell className="text-right">{val.required.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{val.available.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            {val.hasEnough ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-destructive mx-auto" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={onDeclined}>Decline</Button>
                    <Button onClick={handleApprove} disabled={!canApprove || isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Approve
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RecipesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [pendingBatches, setPendingBatches] = useState<ProductionBatch[]>([]);
    const [inProductionBatches, setInProductionBatches] = useState<ProductionBatch[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [recipeSnapshot, productSnapshot, ingredientSnapshot, batchData] = await Promise.all([
                getDocs(collection(db, "recipes")),
                getDocs(collection(db, "products")),
                getDocs(collection(db, "ingredients")),
                getProductionBatches()
            ]);

            setRecipes(recipeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Recipe[]);
            setProducts(productSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, category: doc.data().category })) as Product[]);
            setIngredients(ingredientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ingredient[]);
            setPendingBatches(batchData.pending);
            setInProductionBatches(batchData.in_production);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch data from the database." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchAllData();
    }, [fetchAllData]);

    const handleDecline = () => {
        toast({ title: 'Info', description: 'Decline functionality not implemented yet.' });
    };

    const recipesWithCost = useMemo(() => {
        const ingredientsMap = new Map(ingredients.map(i => [i.id, i]));
        return recipes.map(recipe => {
            const cost = recipe.ingredients.reduce((acc, currentIng) => {
                const ingredientData = ingredientsMap.get(currentIng.ingredientId);
                if (!ingredientData) return acc;
                let quantityInBaseUnit = currentIng.quantity;
                if (ingredientData.unit.toLowerCase() === 'kg' && currentIng.unit.toLowerCase() === 'g') {
                    quantityInBaseUnit = currentIng.quantity / 1000;
                } else if (ingredientData.unit.toLowerCase() === 'l' && currentIng.unit.toLowerCase() === 'ml') {
                     quantityInBaseUnit = currentIng.quantity / 1000;
                }
                
                return acc + (ingredientData.costPerUnit * quantityInBaseUnit);
            }, 0);
            return { ...recipe, cost };
        });
    }, [recipes, ingredients]);

    const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>) => {
        try {
            if (editingRecipe) {
                const recipeRef = doc(db, "recipes", editingRecipe.id);
                await updateDoc(recipeRef, recipeData);
                toast({ title: "Success", description: "Recipe updated successfully." });
            } else {
                await addDoc(collection(db, "recipes"), recipeData);
                toast({ title: "Success", description: "Recipe created successfully." });
            }
            fetchAllData();
        } catch (error) {
            console.error("Error saving recipe:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save recipe." });
        }
    };

    const handleDeleteRecipe = async () => {
        if (!recipeToDelete) return;
        try {
            await deleteDoc(doc(db, "recipes", recipeToDelete.id));
            toast({ title: "Success", description: "Recipe deleted successfully." });
            fetchAllData();
        } catch (error) {
            console.error("Error deleting recipe:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete recipe." });
        } finally {
            setRecipeToDelete(null);
        }
    };

    const openAddDialog = () => {
        setEditingRecipe(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setIsDialogOpen(true);
    };
    
    if (!user) return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    const canApprove = user.role === 'Storekeeper' || user.role === 'Manager' || user.role === 'Developer';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Recipes & Production</h1>
                <Button onClick={openAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Recipe
                </Button>
            </div>

            <RecipeDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveRecipe}
                recipe={editingRecipe}
                products={products}
                ingredients={ingredients}
            />

            <Tabs defaultValue="production">
                <TabsList>
                    <TabsTrigger value="production">Recipes & Production</TabsTrigger>
                    <TabsTrigger value="logs">Production Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="production" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5"/> Batches in Production</CardTitle>
                            <CardDescription>Monitor and complete ongoing production batches. {inProductionBatches.length} active.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> : inProductionBatches.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Batch</TableHead><TableHead>Quantity</TableHead><TableHead>Requested By</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inProductionBatches.map(batch => (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium">{batch.recipeName}</TableCell>
                                                <TableCell>{batch.quantityToProduce}</TableCell>
                                                <TableCell>{batch.requestedByName}</TableCell>
                                                <TableCell className="text-right">
                                                   <CompleteBatchDialog batch={batch} user={user} onCompleted={fetchAllData} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             ) : (
                                <div className="flex items-center justify-center h-24 text-muted-foreground">No batches currently in production.</div>
                             )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Hourglass className="h-5 w-5"/> Pending Ingredient Approval</CardTitle>
                            <CardDescription>Batches waiting for a storekeeper to approve and release ingredients. {pendingBatches.length} pending.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> : pendingBatches.length > 0 ? (
                                <Table>
                                     <TableHeader>
                                        <TableRow><TableHead>Batch</TableHead><TableHead>Quantity</TableHead><TableHead>Requested By</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                         {pendingBatches.map(batch => (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium">{batch.recipeName}</TableCell>
                                                <TableCell>{batch.quantityToProduce}</TableCell>
                                                <TableCell>{batch.requestedByName}</TableCell>
                                                <TableCell className="text-right">
                                                    {canApprove ? (
                                                        <ApproveBatchDialog
                                                            batch={batch}
                                                            allIngredients={ingredients}
                                                            onApproved={fetchAllData}
                                                            onDeclined={handleDecline}
                                                        >
                                                            <Button size="sm" variant="secondary"><ShieldCheck className="mr-2 h-4 w-4"/>Review</Button>
                                                        </ApproveBatchDialog>
                                                    ) : <Badge variant="outline">Pending</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             ) : (
                                <div className="flex items-center justify-center h-24 text-muted-foreground">No batches are pending ingredient approval.</div>
                             )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>All Recipes</CardTitle>
                            <CardDescription>Manage your product recipes and their ingredients. Click "Start Batch" to begin production.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : recipesWithCost.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recipesWithCost.map(recipe => (
                                        <Card key={recipe.id} className="flex flex-col">
                                            <CardHeader>
                                                <div className="aspect-[4/3] bg-muted rounded-md mb-4 flex items-center justify-center">
                                                    <img src="https://placehold.co/400x300.png" alt={recipe.productName} className="rounded-md object-cover" data-ai-hint="bread loaf"/>
                                                </div>
                                                <CardTitle>{recipe.name}</CardTitle>
                                                <CardDescription>For: {recipe.productName}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <p className="text-sm text-muted-foreground">{recipe.description}</p>
                                            </CardContent>
                                            <CardFooter className="flex justify-between items-center">
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Cost/unit: </span>
                                                    <span className="font-bold">₦{recipe.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <StartBatchDialog recipe={recipe} user={user} onStarted={fetchAllData}>
                                                        <Button>Start Batch</Button>
                                                     </StartBatchDialog>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onSelect={() => openEditDialog(recipe)}>Edit</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onSelect={() => setRecipeToDelete(recipe)}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-24 text-center flex items-center justify-center text-muted-foreground">No recipes found. Create one to get started.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="logs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Production Logs</CardTitle>
                            <CardDescription>This feature is coming soon.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                            <p>A log of all production batches will be shown here.</p>
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
                        <AlertDialogAction onClick={handleDeleteRecipe}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
