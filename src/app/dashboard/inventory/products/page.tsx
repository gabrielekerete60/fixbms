
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
import { MoreHorizontal, PlusCircle, FileUp, Loader2, ArrowLeft, ArrowDownUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
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
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns";

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
  lowStockThreshold?: number;
};

type User = {
  name: string;
  role: string;
  staff_id: string;
};

type LogEntry = {
    date: Date;
    type: 'Transfer Out' | 'Production Return' | 'Manual Update' | 'Sale' | 'Waste';
    quantityChange: number;
    details: string;
    staff?: string;
}

const getStatusBadge = (stock: number, threshold?: number) => {
  const lowStock = threshold || 20;
  if (stock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (stock < lowStock) {
    return <Badge variant="secondary">Low Stock</Badge>;
  }
  return <Badge variant="outline">In Stock</Badge>;
};


function ProductDialog({ product, onSave, onOpenChange, categories, user }: { product: Product | null, onSave: (p: Omit<Product, 'id'>) => void, onOpenChange: (open: boolean) => void, categories: string[], user: User | null }) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [costPrice, setCostPrice] = useState(0);
    const [price, setPrice] = useState(0);
    const [stock, setStock] = useState(0);
    const [unit, setUnit] = useState("");
    const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(20);
    
    const isAccountant = user?.role === 'Accountant';

    const handleSubmit = () => {
        const newProductData = {
            name,
            category,
            costPrice: Number(costPrice),
            price: Number(price),
            stock: Number(stock),
            unit: unit,
            image: product?.image || "https://placehold.co/150x150.png",
            "data-ai-hint": product?.['data-ai-hint'] || "product image",
            lowStockThreshold: Number(lowStockThreshold),
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
            setLowStockThreshold(product.lowStockThreshold || 20);
        } else {
            setName("");
            setCategory(categories[0] || "");
            setCostPrice(0);
            setPrice(0);
            setStock(0);
            setUnit("");
            setLowStockThreshold(20);
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
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" disabled={isAccountant} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select value={category} onValueChange={setCategory} disabled={isAccountant}>
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
                            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value))} disabled={true}/>
                         </div>
                         <div className="grid gap-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Input id="unit" placeholder="e.g., loaf, pcs" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={isAccountant}/>
                         </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="low-stock">Low Stock Threshold</Label>
                        <Input id="low-stock" type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} disabled={isAccountant}/>
                        <p className="text-xs text-muted-foreground px-1">Get a 'Low Stock' warning when inventory falls below this number.</p>
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
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={() => { onExport(); setIsOpen(false); }}>Export to CSV</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProductLogs({ product }: { product: Product }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            const allLogs: LogEntry[] = [];
            
            // 1. Fetch transfers
            const transfersQuery = query(collection(db, 'transfers'), where('items', 'array-contains-any', [{productId: product.id}]));
            const transfersSnap = await getDocs(transfersQuery);
            transfersSnap.forEach(doc => {
                const data = doc.data();
                const item = data.items.find((i: any) => i.productId === product.id);
                if (item) {
                     if (data.notes?.startsWith('Return from production batch')) {
                         allLogs.push({
                            date: data.date.toDate(),
                            type: 'Production Return',
                            quantityChange: item.quantity,
                            details: `From Batch ${data.notes.split(' ').pop()}`,
                            staff: data.from_staff_name
                        });
                     } else {
                         allLogs.push({
                            date: data.date.toDate(),
                            type: 'Transfer Out',
                            quantityChange: -item.quantity,
                            details: `To ${data.to_staff_name}`,
                            staff: data.from_staff_name
                        });
                     }
                }
            });

            // 2. Fetch Waste Logs
            const wasteQuery = query(collection(db, 'waste_logs'), where('productId', '==', product.id));
            const wasteSnap = await getDocs(wasteQuery);
            wasteSnap.forEach(doc => {
                const data = doc.data();
                allLogs.push({
                    date: data.date.toDate(),
                    type: 'Waste',
                    quantityChange: -data.quantity,
                    details: `Reason: ${data.reason}`,
                    staff: data.staffName
                })
            });

            // Note: Sales are deducted from personal_stock, not main inventory directly.
            // A more complex system would trace stock back, but for now we focus on main inventory movements.

            setLogs(allLogs.sort((a, b) => b.date.getTime() - a.date.getTime()));
            setIsLoading(false);
        }
        fetchLogs();
    }, [product]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Logs: {product.name}</CardTitle>
                <CardDescription>A complete audit trail of stock movements for this product.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Staff</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No logs found for this product.</TableCell></TableRow>
                            ) : logs.map((log, index) => (
                                <TableRow key={index}>
                                    <TableCell>{format(log.date, 'Pp')}</TableCell>
                                    <TableCell><Badge variant={log.quantityChange > 0 ? 'default' : 'secondary'}>{log.type}</Badge></TableCell>
                                    <TableCell className={log.quantityChange > 0 ? 'text-green-500' : 'text-destructive'}>
                                        {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                                    </TableCell>
                                    <TableCell>{log.details}</TableCell>
                                    <TableCell>{log.staff || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [viewingLogsFor, setViewingLogsFor] = useState<Product | null>(null);
  const [activeStockTab, setActiveStockTab] = useState("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState("name_asc");

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }

    const productsCollection = collection(db, "products");
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
        const productsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Product[];
        setProducts(productsList);
        if (isLoading) setIsLoading(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch products from the database.",
        });
        if (isLoading) setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, isLoading]);

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
        if (editingProduct && editingProduct.id) {
            const { stock, ...updateData } = productData;
            await updateDoc(doc(db, "products", editingProduct.id), updateData);
            toast({ title: "Success", description: "Product updated successfully." });
        } else {
            await addDoc(collection(db, "products"), { ...productData, stock: 0 });
            toast({ title: "Success", description: "Product created successfully." });
        }
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
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete product." });
    } finally {
        setProductToDelete(null);
    }
  };

  const { productsWithFinancials, grandTotalValue, grandTotalProfit } = useMemo(() => {
    let filtered = products.filter(p => {
        if (activeStockTab === 'all') return true;
        const threshold = p.lowStockThreshold || 20;
        if (activeStockTab === 'in-stock') return p.stock >= threshold;
        if (activeStockTab === 'low-stock') return p.stock > 0 && p.stock < threshold;
        if (activeStockTab === 'out-of-stock') return p.stock === 0;
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
    
    productsWithFinancials.sort((a, b) => {
        switch (sort) {
            case "name_asc": return a.name.localeCompare(b.name);
            case "name_desc": return b.name.localeCompare(a.name);
            case "price_asc": return a.price - b.price;
            case "price_desc": return b.price - a.price;
            case "stock_asc": return a.stock - b.stock;
            case "stock_desc": return b.stock - a.stock;
            case "profit_asc": return a.totalProfit - b.totalProfit;
            case "profit_desc": return b.totalProfit - a.totalProfit;
            default: return 0;
        }
    });

    return { productsWithFinancials, grandTotalValue, grandTotalProfit };
  }, [products, activeStockTab, sort]);
  
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

  const handleViewLogs = (product: Product) => {
    setViewingLogsFor(product);
    setActiveTab('logs');
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'products') {
        setViewingLogsFor(null);
    }
  }

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);
  const canManageProducts = user?.role === 'Manager' || user?.role === 'Developer' || user?.role === 'Storekeeper';
  const canViewFinancials = user?.role === 'Manager' || user?.role === 'Supervisor' || user?.role === 'Developer' || user?.role === 'Accountant';

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
          {canManageProducts && (
            <Button onClick={() => setEditingProduct({} as Product)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          )}
        </div>
      </div>
       <ProductDialog 
            product={editingProduct} 
            onSave={handleSaveProduct}
            onOpenChange={() => setEditingProduct(null)}
            categories={categories}
            user={user}
        />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="logs">
            Product Logs {viewingLogsFor && `- ${viewingLogsFor.name}`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="overflow-x-auto pb-2">
                <Tabs value={activeStockTab} onValueChange={setActiveStockTab}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="in-stock">In Stock</TabsTrigger>
                    <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                    <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <ArrowDownUp className="mr-2 h-4 w-4" />
                        Sort By
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                        <DropdownMenuRadioItem value="name_asc">Name (A-Z)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="name_desc">Name (Z-A)</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="price_desc">Price (High-Low)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="price_asc">Price (Low-High)</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="stock_desc">Stock (High-Low)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="stock_asc">Stock (Low-High)</DropdownMenuRadioItem>
                         {canViewFinancials && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioItem value="profit_desc">Total Profit (High-Low)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="profit_asc">Total Profit (Low-High)</DropdownMenuRadioItem>
                            </>
                         )}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
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
                      <TableRow 
                        key={product.id} 
                        onClick={() => {
                          if (!menuOpenId) {
                            setEditingProduct(product);
                          }
                        }}
                        className="cursor-pointer"
                      >
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
                        <TableCell>{getStatusBadge(product.stock, product.lowStockThreshold)}</TableCell>
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
                            <DropdownMenu onOpenChange={(open) => setMenuOpenId(open ? product.id : null)}>
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
                                <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); setEditingProduct(product);}}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); handleViewLogs(product)}}>View Logs</DropdownMenuItem>
                                {canManageProducts && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => {e.stopPropagation(); setProductToDelete(product)}}>
                                        Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="logs">
            {viewingLogsFor ? (
                <ProductLogs product={viewingLogsFor} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Product Logs</CardTitle>
                        <CardDescription>Select a product to view its history.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                        <p>Go to the "Products" tab and click "View Logs" on an item to see its history here.</p>
                    </CardContent>
                </Card>
            )}
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
