
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2 } from "lucide-react";
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
import { handleSaveRecipe, handleDeleteRecipe } from "@/app/actions";

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
  ingredients: allIngredients,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Recipe, 'id'>, recipeId?: string) => void;
  recipe: Partial<Recipe> | null;
  products: Product[];
  ingredients: Ingredient[];
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
        } else if (field === 'quantity') {
            newIngredients[index].quantity = Number(value);
        } else {
            newIngredients[index][field] = value as string;
        }
        setRecipeIngredients(newIngredients);
    };

    const handleSubmit = () => {
        if (!name || !selectedProductId || recipeIngredients.some(i => !i.ingredientId)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Recipe name, product, and all ingredients must be filled.' });
            return;
        }
        const selectedProduct = products.find(p => p.id === selectedProductId);

        onSave({ 
            name, 
            description, 
            productId: selectedProductId,
            productName: selectedProduct?.name || '',
            ingredients: recipeIngredients,
        }, recipe?.id);
        onOpenChange(false);
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
                                    <Input placeholder="Unit" value={ing.unit} onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)} />
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
                    <Button onClick={handleSubmit}>{recipe?.id ? 'Save Changes' : 'Create Recipe'}</Button>
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
    
    const [isLoading, setIsLoading] = useState(true);
    const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [recipeSnapshot, productSnapshot, ingredientSnapshot] = await Promise.all([
                getDocs(collection(db, "recipes")),
                getDocs(collection(db, "products")),
                getDocs(collection(db, "ingredients")),
            ]);

            setRecipes(recipeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ingredients: doc.data().ingredients || [] } as Recipe)));
            setProducts(productSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, category: doc.data().category } as Product)));
            setIngredients(ingredientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));

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

    const handleSave = async (recipeData: Omit<Recipe, 'id'>, recipeId?: string) => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in to save a recipe." });
            return;
        }
        const result = await handleSaveRecipe(recipeData, user, recipeId);
        if (result.success) {
            toast({ title: "Success", description: "Recipe saved successfully." });
            fetchAllData();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
    };

    const handleDelete = async () => {
        if (!recipeToDelete || !user) return;
        const result = await handleDeleteRecipe(recipeToDelete.id, recipeToDelete.name, user);
        if (result.success) {
            toast({ title: "Success", description: "Recipe deleted successfully." });
            fetchAllData();
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
                    onSave={handleSave}
                    recipe={editingRecipe}
                    products={products}
                    ingredients={ingredients}
                />
            )}

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
                                                <DropdownMenuItem onSelect={() => openEditDialog(recipe)}>Edit</DropdownMenuItem>
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
