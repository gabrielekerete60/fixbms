
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2, Beaker, Hourglass } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Product = {
  id: string;
  name: string;
  category: string;
};

type Ingredient = {
    id: string;
    name: string;
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

export default function RecipesPage() {
    const { toast } = useToast();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const recipesCollection = collection(db, "recipes");
            const recipeSnapshot = await getDocs(recipesCollection);
            const recipesList = recipeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Recipe[];
            setRecipes(recipesList);

            const productsCollection = collection(db, "products");
            const productSnapshot = await getDocs(productsCollection);
            const productsList = productSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, category: doc.data().category })) as Product[];
            setProducts(productsList);

            const ingredientsCollection = collection(db, "ingredients");
            const ingredientSnapshot = await getDocs(ingredientsCollection);
            const ingredientsList = ingredientSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Ingredient[];
            setIngredients(ingredientsList);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch data from the database." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

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
                            <CardDescription>Monitor and complete ongoing production batches. 0 active.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-24 text-muted-foreground">
                            <p>No batches currently in production.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Hourglass className="h-5 w-5"/> Pending Ingredient Approval</CardTitle>
                            <CardDescription>Batches waiting for a storekeeper to approve and release ingredients. 0 pending.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-24 text-muted-foreground">
                             <p>No batches are pending ingredient approval.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>All Recipes</CardTitle>
                            <CardDescription>Manage your product recipes and their ingredients.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Recipe Name</TableHead>
                                        <TableHead>Makes Product</TableHead>
                                        <TableHead>No. of Ingredients</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                            </TableCell>
                                        </TableRow>
                                    ) : recipes.length > 0 ? (
                                        recipes.map(recipe => (
                                            <TableRow key={recipe.id}>
                                                <TableCell className="font-medium">{recipe.name}</TableCell>
                                                <TableCell>{recipe.productName}</TableCell>
                                                <TableCell>{recipe.ingredients.length} items</TableCell>
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
                                                            <DropdownMenuItem onSelect={() => openEditDialog(recipe)}>Edit</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onSelect={() => setRecipeToDelete(recipe)}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No recipes found. Create one to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
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
