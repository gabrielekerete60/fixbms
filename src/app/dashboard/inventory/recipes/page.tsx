
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2, CheckCircle, XCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { handleSaveRecipe, handleDeleteRecipe, startProductionBatch, approveIngredientRequest, declineProductionBatch, completeProductionBatch, ProductionBatch, ProductionLog, getRecipes, getIngredients, getProducts } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
            // This case might not be used if unit is read-only, but good practice
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

        const result = await handleSaveRecipe({ 
            name, 
            description, 
            productId: selectedProductId,
            productName: selectedProduct?.name || '',
            ingredients: recipeIngredients,
        }, user, recipe?.id);

        if (result.success) {
            toast({ title: "Success", description: "Recipe saved successfully." });
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        onOpenChange(false);
    };
    
    const handleStartProduction = async () => {
        if (!recipe?.id || !user) return;
        
        const quantity = prompt("Enter quantity to produce:", "1");
        if (quantity === null || isNaN(Number(quantity)) || Number(quantity) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid quantity' });
            return;
        }
        
        const batchData = {
            recipeId: recipe.id,
            recipeName: recipe.name || '',
            productId: recipe.productId || '',
            productName: recipe.productName || '',
            requestedById: user.staff_id,
            requestedByName: user.name,
            quantityToProduce: Number(quantity),
            ingredients: recipe.ingredients || [],
        };
        
        const result = await startProductionBatch(batchData, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Production batch requested for approval.'});
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error});
        }
    }

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
                    <div>
                        {recipe?.id && (
                             <Button variant="secondary" onClick={handleStartProduction}>Start Production Batch</Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{recipe?.id ? 'Save Changes' : 'Create Recipe'}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ApproveBatchDialog({ batch, user, allIngredients }: { batch: ProductionBatch, user: User, allIngredients: Ingredient[] }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const ingredientsWithStock = useMemo(() => {
        return batch.ingredients.map(reqIng => {
            const stockIng = allIngredients.find(sIng => sIng.id === reqIng.ingredientId);
            const stockAvailable = stockIng?.stock || 0;
            const hasEnough = stockAvailable >= reqIng.quantity;
            return { ...reqIng, stockAvailable, hasEnough };
        });
    }, [batch.ingredients, allIngredients]);

    const canApprove = ingredientsWithStock.every(ing => ing.hasEnough);
    
    const handleApprove = async () => {
        setIsLoading(true);
        const result = await approveIngredientRequest(batch.id, batch.ingredients, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch approved and moved to production.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    const handleDecline = async () => {
        setIsLoading(true);
        const result = await declineProductionBatch(batch.id, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch has been declined.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild><Button size="sm">Review</Button></AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Approve Production Batch?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Batch ID: {batch.id.substring(0,6)}...<br/>
                        Request for <strong>{batch.quantityToProduce} x {batch.productName}</strong>. This will deduct ingredients from inventory.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="max-h-60 overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead>Required</TableHead><TableHead>In Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {ingredientsWithStock.map(ing => (
                                <TableRow key={ing.ingredientId}>
                                    <TableCell>{ing.ingredientName}</TableCell>
                                    <TableCell>{ing.quantity} {ing.unit}</TableCell>
                                    <TableCell>{ing.stockAvailable.toFixed(2)} {ing.unit}</TableCell>
                                    <TableCell>
                                        {ing.hasEnough ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <AlertDialogFooter>
                     <Button variant="destructive" onClick={handleDecline} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
                        Decline
                    </Button>
                     <Button onClick={handleApprove} disabled={isLoading || !canApprove}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Approve
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function RecipesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    
    // Real-time states
    const [pendingBatches, setPendingBatches] = useState<ProductionBatch[]>([]);
    const [inProductionBatches, setInProductionBatches] = useState<ProductionBatch[]>([]);
    const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    
    const fetchStaticData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [recipeData, productData, ingredientData] = await Promise.all([
                getRecipes(),
                getProducts(),
                getIngredients(),
            ]);

            setRecipes(recipeData);
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
        // Production Batches
        const qBatches = query(collection(db, 'production_batches'), orderBy('createdAt', 'desc'));
        const unsubBatches = onSnapshot(qBatches, (snapshot) => {
            const allBatches = snapshot.docs.map(doc => {
                 const data = doc.data();
                 const createdAt = (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate().toISOString() : data.createdAt;
                 return {
                    id: doc.id,
                    ...data,
                    createdAt: createdAt,
                } as ProductionBatch
            });
            setPendingBatches(allBatches.filter(b => b.status === 'pending_approval'));
            setInProductionBatches(allBatches.filter(b => b.status === 'in_production'));
        }, (error) => {
            console.error("Error fetching production batches:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not listen for production batch updates.'});
        });

        // Production Logs
        const qLogs = query(collection(db, 'production_logs'), orderBy('timestamp', 'desc'));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
             const logs = snapshot.docs.map(doc => {
                 const data = doc.data();
                 const timestamp = (data.timestamp as any)?.toDate ? (data.timestamp as any).toDate().toISOString() : data.timestamp;
                 return {
                    id: doc.id,
                    ...data,
                    timestamp: timestamp,
                } as ProductionLog
             });
            setProductionLogs(logs);
        }, (error) => {
            console.error("Error fetching production logs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not listen for production log updates.'});
        });
        
        // Listen for recipe changes to keep the list fresh
        const qRecipes = query(collection(db, "recipes"));
        const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
            setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)))
        }, (error) => {
             console.error("Error fetching recipes:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not listen for recipe updates.'});
        })

        return () => {
            unsubBatches();
            unsubLogs();
            unsubRecipes();
        }
    }, [toast]);

    const handleDelete = async () => {
        if (!recipeToDelete || !user) return;
        const result = await handleDeleteRecipe(recipeToDelete.id, recipeToDelete.name, user);
        if (result.success) {
            toast({ title: "Success", description: "Recipe deleted successfully." });
        } else {
            toast({ variant: "destructive", title: "Error", description: "Could not delete recipe." });
        }
        setRecipeToDelete(null);
    };

    const openAddDialog = () => {
        setEditingRecipe({});
        setIsDialogOpen(true);
    };

    const openEditDialog = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setIsDialogOpen(true);
    };
    
    if (!user) {
         return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Recipes &amp; Production</h1>
                <Button onClick={openAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Recipe
                </Button>
            </div>

            {isDialogOpen && (
                <RecipeDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    recipe={editingRecipe}
                    products={products}
                    ingredients={ingredients}
                    user={user}
                />
            )}
            
            <Tabs defaultValue="recipes">
                <TabsList>
                    <TabsTrigger value="recipes">Recipes</TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                        Pending Approval
                        {pendingBatches.length > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                                {pendingBatches.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="production" className="relative">
                        Batches in Production
                         {inProductionBatches.length > 0 && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                                {inProductionBatches.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="logs">Production Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="recipes">
                     <Card>
                        <CardHeader>
                            <CardTitle>All Recipes</CardTitle>
                            <CardDescription>Manage your product recipes and their ingredients.</CardDescription>
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
                                                        <DropdownMenuItem onSelect={() => openEditDialog(recipe)}>Edit / Start Production</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onSelect={() => setRecipeToDelete(recipe)}>Delete</DropdownMenuItem>
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
                <TabsContent value="pending">
                     <Card>
                        <CardHeader>
                            <CardTitle>Pending Batch Approvals</CardTitle>
                            <CardDescription>Batches requested by bakers that need ingredient approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Requested By</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {pendingBatches.length > 0 ? pendingBatches.map(batch => (
                                        <TableRow key={batch.id}>
                                            <TableCell>{format(new Date(batch.createdAt), 'PPP')}</TableCell>
                                            <TableCell>{batch.productName}</TableCell>
                                            <TableCell>{batch.quantityToProduce}</TableCell>
                                            <TableCell>{batch.requestedByName}</TableCell>
                                            <TableCell><ApproveBatchDialog batch={batch} user={user} allIngredients={ingredients} /></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No batches are pending approval.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="production">
                     <Card>
                        <CardHeader>
                            <CardTitle>Batches in Production</CardTitle>
                            <CardDescription>These batches have been approved and are currently being produced.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Requested By</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {inProductionBatches.length > 0 ? inProductionBatches.map(batch => (
                                        <TableRow key={batch.id}>
                                            <TableCell>{format(new Date(batch.createdAt), 'PPP')}</TableCell>
                                            <TableCell>{batch.productName}</TableCell>
                                            <TableCell>{batch.quantityToProduce}</TableCell>
                                            <TableCell>{batch.requestedByName}</TableCell>
                                            <TableCell><Badge variant="secondary">{batch.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No batches are in production.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="logs">
                     <Card>
                        <CardHeader>
                            <CardTitle>Production Logs</CardTitle>
                            <CardDescription>A complete audit trail of all recipe and production activities.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Staff</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {productionLogs.length > 0 ? productionLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.timestamp), 'Pp')}</TableCell>
                                            <TableCell>{log.staffName}</TableCell>
                                            <TableCell><Badge>{log.action}</Badge></TableCell>
                                            <TableCell>{log.details}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No production logs found.</TableCell></TableRow>}
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
