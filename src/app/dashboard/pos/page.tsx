"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Minus, X, Search, History, Hand, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";


const products = [
  { id: 1, name: "Classic Croissant", price: 350.00, stock: 120, category: 'Pastries', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'croissant pastry' },
  { id: 2, name: "Sourdough Loaf", price: 700.00, stock: 42, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'sourdough bread' },
  { id: 3, name: "Chocolate Chip Cookie", price: 250.00, stock: 14, category: 'Cookies', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'chocolate cookie' },
  { id: 4, name: "Blueberry Muffin", price: 325.00, stock: 80, category: 'Muffins', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'blueberry muffin' },
  { id: 5, name: "Artisan Baguette", price: 450.00, stock: 0, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'baguette bread' },
  { id: 6, name: "Cinnamon Roll", price: 400.00, stock: 59, category: 'Pastries', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'cinnamon roll' },
  { id: 7, name: "Coca-Cola (50cl)", price: 300.00, stock: 200, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola' },
  { id: 8, name: "Bottled Water (75cl)", price: 200.00, stock: 150, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water' },
];

const customers = [
    { id: 'cust_1', name: 'John Doe', email: 'john.doe@example.com' },
    { id: 'cust_2', name: 'Jane Smith', email: 'jane.smith@example.com' },
];

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([
    {id: 8, name: 'Bottled Water (75cl)', price: 200.00, quantity: 1},
    {id: 7, name: 'Coca-Cola (50cl)', price: 300.00, quantity: 1}
  ]);

  const addToCart = (product: typeof products[0]) => {
     if (product.stock === 0) return;
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    setCart((prevCart) => {
      if (newQuantity <= 0) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };
  
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.05; // 5% VAT
  const total = subtotal + tax;
  const categories = ['All', ...new Set(products.map(p => p.category))];

  return (
     <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[1fr_400px] gap-6 h-[calc(100vh_-_8rem)] text-white bg-gray-900 p-6 -m-6 font-sans">
      {/* Products Section */}
      <div className="lg:col-span-2 xl:col-span-1 flex flex-col gap-4">
        <header>
            <h1 className="text-2xl font-bold">Point of Sale</h1>
        </header>
         <Tabs defaultValue="All">
            <TabsList className="bg-gray-800">
                {categories.map(category => (
                    <TabsTrigger key={category} value={category} className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
                        {category}
                    </TabsTrigger>
                ))}
                 <TabsTrigger value="held" className="flex gap-2">
                    Held Orders <Badge className="bg-blue-500 text-white">0</Badge>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="All" className="flex-grow flex flex-col">
                <div className="flex flex-col gap-2 mb-4">
                    <h2 className="text-xl font-semibold">All Products</h2>
                    <p className="text-sm text-gray-400">Click on a product to add it to the order.</p>
                </div>
                 <ScrollArea className="h-[calc(100vh_-_20rem)]">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
                    {products.map((product) => (
                        <Card
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`cursor-pointer hover:shadow-lg transition-shadow group bg-gray-800 border-gray-700 text-white ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                        <CardContent className="p-0 relative">
                            <Image
                            src={product.image}
                            alt={product.name}
                            width={150}
                            height={150}
                            className="rounded-t-lg object-cover w-full aspect-square"
                            data-ai-hint={product['data-ai-hint']}
                            />
                             <Badge className="absolute top-2 right-2 bg-gray-900/80 text-white border-none">
                                Stock: {product.stock}
                            </Badge>
                             {product.stock === 0 && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-t-lg">
                                    <p className="font-bold text-lg">Out of Stock</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-3 flex flex-col items-start">
                            <h3 className="font-semibold text-sm">{product.name}</h3>
                            <p className="text-sm text-blue-400">₦{product.price.toFixed(2)}</p>
                        </CardFooter>
                        </Card>
                    ))}
                    </div>
                </ScrollArea>
            </TabsContent>
            {categories.filter(c => c !== 'All').map(category => (
                <TabsContent key={category} value={category} className="h-full">
                     <p>Products for {category}</p>
                </TabsContent>
            ))}
        </Tabs>
      </div>

      {/* Order Summary Section */}
      <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Current Order</h2>
        <Tabs defaultValue="walk-in" className="mb-4">
            <TabsList className="grid w-full grid-cols-1 bg-gray-900 h-auto">
                <Button variant="ghost" className="data-[state=active]:bg-gray-700">Takeout</Button>
            </TabsList>
        </Tabs>

        <Tabs defaultValue="registered" className="mb-4">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900">
                <TabsTrigger value="walk-in" className="data-[state=active]:bg-gray-700">Walk-in</TabsTrigger>
                <TabsTrigger value="registered" className="data-[state=active]:bg-blue-600">Registered</TabsTrigger>
            </TabsList>
            <TabsContent value="registered" className="mt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input placeholder="Search by name or email..." className="bg-gray-900 border-gray-700 pl-10" />
                </div>
            </TabsContent>
        </Tabs>
        
        <ScrollArea className="flex-grow -mr-4 pr-4 mb-4">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No items in cart</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 text-sm">
                  <div className="flex-grow">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-gray-400">₦{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-900 rounded-md p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span>{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                   <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => updateQuantity(item.id, 0)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
                <Input placeholder="Promo Code" className="bg-gray-900 border-gray-700"/>
                <Button className="bg-gray-700 hover:bg-gray-600">Apply</Button>
            </div>
            <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span>₦{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Tax (5%)</span>
                    <span>₦{tax.toFixed(2)}</span>
                </div>
                <Separator className="bg-gray-700 my-2" />
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₦{total.toFixed(2)}</span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="border-gray-600 hover:bg-gray-700 hover:text-white flex gap-2">
                    <Hand className="w-4 h-4"/> Hold
                </Button>
                 <Button variant="destructive" className="bg-red-800 hover:bg-red-700 flex gap-2" onClick={clearCart}>
                    <Trash2 className="w-4 h-4"/> Clear
                </Button>
                 <Button className="bg-blue-600 hover:bg-blue-500 col-span-3 lg:col-span-1">
                    Checkout
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
