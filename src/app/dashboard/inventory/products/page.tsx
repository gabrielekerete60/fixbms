
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
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
  DialogClose,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
  image: string;
  "data-ai-hint": string;
  costPrice?: number;
};

type User = {
  name: string;
  role: string;
  staff_id: string;
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


function ProductDialog({ product, onSave, onOpenChange, categories }: { product: Product | null, onSave: (p: Omit<Product, 'id'>) => void, onOpenChange: (open: boolean) => void, categories: string[] }) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [costPrice, setCostPrice] = useState(0);
    const [price, setPrice] = useState(0);
    const [stock, setStock] = useState(0);
    const [unit, setUnit] = useState("");

    const handleSubmit = () => {
        const newProductData = {
            name,
            category,
            costPrice: Number(costPrice),
            price: Number(price),
            stock: Number(stock),
            unit: unit,
            image: product?.image || "https://placehold.co/150x150.png",
            "data-ai-hint": product?.['data-ai-hint'] || "product image"
        };
        onSave(newProductData);
        onOpenChange(false);
    }

    useEffect(() => {
        if (product) {
            setName(product.name || "");
            setCategory(product.category || "");
            setCostPrice(product.costPrice || 0);
            setPrice(product.price || 0);
            setStock(product.stock || 0);
            setUnit(product.unit || "");
        } else {
            setName("");
            setCategory(categories[0] || "");
            setCostPrice(0);
            setPrice(0);
            setStock(0);
            setUnit("");
        }
    }, [product, categories]);
    
    const isOpen = product !== null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product?.id ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                        {product?.id ? "Update the details of this product." : "Fill in the details for the new product."}
                    </DialogDescription>
                    <DialogClose />
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPrice" className="text-right">Cost Price (₦)</Label>
                        <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Selling Price (₦)</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="stock">Stock</Label>
                            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value))} />
                         </div>
                         <div className="grid gap-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Input id="unit" placeholder="e.g., loaf, pcs" value={unit} onChange={(e) => setUnit(e.target.value)} />
                         </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>{product?.id ? "Save Changes" : "Create Product"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ExportDialog({ children, onExport }: { children: React.ReactNode, onExport: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Products</DialogTitle>
          <DialogDescription>
            All current products will be included in the CSV file.
          </DialogDescription>
          <DialogClose />
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={() => { onExport(); setIsOpen(false); }}>Export to CSV</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }
    fetchProducts();
    window.addEventListener('focus', fetchProducts);
    return () => {
        window.removeEventListener('focus', fetchProducts);
    }
  }, [fetchProducts]);

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
        if (editingProduct && editingProduct.id) {
            const productRef = doc(db, "products", editingProduct.id);
            await updateDoc(productRef, productData);
            toast({ title: "Success", description: "Product updated successfully." });
        } else {
            await addDoc(collection(db, "products"), productData);
            toast({ title: "Success", description: "Product created successfully." });
        }
        fetchProducts();
    } catch (error) {
        console.error("Error saving product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save product." });
    } finally {
        setEditingProduct(null);
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
        await deleteDoc(doc(db, "products", productToDelete.id));
        toast({ title: "Success", description: "Product deleted successfully." });
        fetchProducts();
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete product." });
    } finally {
        setProductToDelete(null);
    }
  };

  const { productsWithFinancials, grandTotalValue, grandTotalProfit } = useMemo(() => {
    const filtered = products.filter(p => {
        if (activeTab === 'all') return true;
        if (activeTab === 'in-stock') return p.stock >= 20;
        if (activeTab === 'low-stock') return p.stock > 0 && p.stock < 20;
        if (activeTab === 'out-of-stock') return p.stock === 0;
        return true;
    });

    let grandTotalValue = 0;
    let grandTotalProfit = 0;

    const productsWithFinancials = filtered.map(p => {
      const price = Number(p.price) || 0;
      const costPrice = Number(p.costPrice) || 0;
      const stock = Number(p.stock) || 0;

      const totalValue = stock * costPrice;
      const totalProfit = (price - costPrice) * stock;

      grandTotalValue += totalValue;
      grandTotalProfit += totalProfit;

      return {
        ...p,
        price,
        costPrice,
        profitPerItem: price - costPrice,
        totalValue,
        totalProfit
      };
    });

    return { productsWithFinancials, grandTotalValue, grandTotalProfit };
  }, [products, activeTab]);
  
  const handleExport = () => {
    const headers = ["ID", "Name", "Category", "Cost Price", "Selling Price", "Profit Per Item", "Stock", "Unit", "Total Value", "Total Profit"];
    const rows = productsWithFinancials.map(p => 
        [p.id, p.name, p.category, p.costPrice || 0, p.price, p.profitPerItem, p.stock, p.unit, p.totalValue, p.totalProfit].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: "Product data exported." });
  };

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);

  const canViewFinancials = user?.role === 'Manager' || user?.role === 'Supervisor' || user?.role === 'Developer';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline">Products</h1>
        <div className="flex items-center gap-2">
           <ExportDialog onExport={handleExport}>
            <Button variant="outline">
                <FileUp className="mr-2 h-4 w-4" />
                Export
            </Button>
           </ExportDialog>
          <Button onClick={() => setEditingProduct({} as Product)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>
       <ProductDialog 
            product={editingProduct} 
            onSave={handleSaveProduct}
            onOpenChange={() => setEditingProduct(null)}
            categories={categories}
        />

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
                    {canViewFinancials && <TableHead>Cost Price</TableHead>}
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Stock</TableHead>
                    {canViewFinancials && <TableHead>Total Value</TableHead>}
                    {canViewFinancials && <TableHead>Total Profit</TableHead>}
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={canViewFinancials ? 8 : 6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : productsWithFinancials.length > 0 ? (
                    productsWithFinancials.map((product) => (
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
                        {canViewFinancials && <TableCell>₦{(product.costPrice || 0).toFixed(2)}</TableCell>}
                        <TableCell>₦{product.price.toFixed(2)}</TableCell>
                        <TableCell>{product.stock > 0 ? `${product.stock} ${product.unit || ''}`.trim() : '--'}</TableCell>
                        {canViewFinancials && <TableCell>₦{product.totalValue.toFixed(2)}</TableCell>}
                        {canViewFinancials && 
                          <TableCell className={product.totalProfit < 0 ? 'text-destructive' : 'text-green-600'}>
                              {product.totalProfit < 0 ? `-₦${Math.abs(product.totalProfit).toFixed(2)}` : `₦${product.totalProfit.toFixed(2)}`}
                          </TableCell>
                        }
                        <TableCell>
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
                                <DropdownMenuItem className="text-destructive" onSelect={() => setProductToDelete(product)}>
                                    Delete
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canViewFinancials ? 8 : 6} className="h-24 text-center">
                        No products found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {canViewFinancials && (
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={5} className="font-bold text-right">Grand Totals</TableCell>
                            <TableCell className="font-bold">₦{grandTotalValue.toFixed(2)}</TableCell>
                            <TableCell className="font-bold text-green-600">₦{grandTotalProfit.toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                )}
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
      <AlertDialog open={productToDelete !== null} onOpenChange={(open) => !open && setProductToDelete(null)}>
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

    