
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
import { MoreHorizontal, PlusCircle, FileUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, getDocs } from "firebase/firestore";
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

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    fetchProducts();
  }, [toast]);

  const productsWithProfit = useMemo(() => {
    return products.map(p => ({
      ...p,
      profit: p.price - (p.costPrice || 0)
    }));
  }, [products]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline">Products</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
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
               <Tabs defaultValue="all">
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
                        Loading products...
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
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View Logs</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No products found. Add products to get started.
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
    </div>
  );
}
