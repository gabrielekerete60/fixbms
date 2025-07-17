
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, FileUp, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  "data-ai-hint": string;
  costPrice?: number;
};

const getStatusBadge = (stock: number) => {
  if (stock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (stock < 20) {
    return <Badge variant="secondary">Low Stock</Badge>;
  }
  return <Badge variant="outline">In Stock</Badge>;
};


function ProductDialog({ product, onSave, children }: { product?: Product | null, onSave: (p: Omit<Product, 'id'>) => void, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState(product?.name || "");
    const [category, setCategory] = useState(product?.category || "Breads");
    const [costPrice, setCostPrice] = useState(product?.costPrice || 0);
    const [price, setPrice] = useState(product?.price || 0);
    const [stock, setStock] = useState(product?.stock || 0);

    const handleSubmit = () => {
        const newProductData = {
            name,
            category,
            costPrice: Number(costPrice),
            price: Number(price),
            stock: Number(stock),
            image: product?.image || "https://placehold.co/150x150.png",
            "data-ai-hint": product?.['data-ai-hint'] || "product image"
        };
        onSave(newProductData);
        setIsOpen(false);
    }

    useEffect(() => {
        if (isOpen) {
            setName(product?.name || "");
            setCategory(product?.category || "Breads");
            setCostPrice(product?.costPrice || 0);
            setPrice(product?.price || 0);
            setStock(product?.stock || 0);
        }
    }, [isOpen, product]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                        {product ? "Update the details of this product." : "Fill in the details for the new product."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPrice" className="text-right">Cost Price (₦)</Label>
                        <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Selling Price (₦)</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Stock</Label>
                        <Input id="stock" type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value))} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>{product ? "Save Changes" : "Create Product"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const productsCollection = collection(db, "products");
      const productSnapshot = await getDocs(productsCollection);
      const productsList = productSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch products from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [toast]);

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
        if (editingProduct) {
            const productRef = doc(db, "products", editingProduct.id);
            await updateDoc(productRef, productData);
            toast({ title: "Success", description: "Product updated successfully." });
        } else {
            await addDoc(collection(db, "products"), productData);
            toast({ title: "Success", description: "Product created successfully." });
        }
        fetchProducts(); // Refresh data
        setEditingProduct(null);
    } catch (error) {
        console.error("Error saving product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save product." });
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
        await deleteDoc(doc(db, "products", productToDelete.id));
        toast({ title: "Success", description: "Product deleted successfully." });
        fetchProducts(); // Refresh data
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete product." });
    } finally {
        setIsDeleteDialogOpen(false);
        setProductToDelete(null);
    }
  };
  
  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  }

  const productsWithProfit = useMemo(() => {
    const filtered = products.filter(p => {
        if (activeTab === 'all') return true;
        if (activeTab === 'in-stock') return p.stock >= 20;
        if (activeTab === 'low-stock') return p.stock > 0 && p.stock < 20;
        if (activeTab === 'out-of-stock') return p.stock === 0;
        return true;
    });

    return filtered.map(p => ({
      ...p,
      profit: p.price - (p.costPrice || 0)
    }));
  }, [products, activeTab]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline">Products</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />
            Export
          </Button>
          <ProductDialog onSave={handleSaveProduct}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </ProductDialog>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="logs">Product Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <Card>
            <CardHeader>
               <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="in-stock">In Stock</TabsTrigger>
                  <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                  <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Card>
                 <CardHeader>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>
                    Manage your products and view their inventory levels.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : productsWithProfit.length > 0 ? (
                    productsWithProfit.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                              data-ai-hint={product["data-ai-hint"]}
                            />
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.stock)}</TableCell>
                        <TableCell>₦{(product.costPrice || 0).toFixed(2)}</TableCell>
                        <TableCell>₦{product.price.toFixed(2)}</TableCell>
                        <TableCell className={product.profit < 0 ? 'text-destructive' : 'text-green-600'}>
                           {product.profit < 0 ? `-₦${Math.abs(product.profit).toFixed(2)}` : `₦${product.profit.toFixed(2)}`}
                        </TableCell>
                        <TableCell>{product.stock > 0 ? product.stock : '--'}</TableCell>
                        <TableCell>
                           <ProductDialog product={editingProduct} onSave={handleSaveProduct}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button
                                        aria-haspopup="true"
                                        size="icon"
                                        variant="ghost"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => setEditingProduct(product)}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem>View Logs</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={() => openDeleteDialog(product)}>
                                        Delete
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </ProductDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No products found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="logs">
            <Card>
                <CardHeader>
                    <CardTitle>Product Logs</CardTitle>
                    <CardDescription>This feature is coming soon.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Product activity logs will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
