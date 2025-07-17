"use client";

import { useState } from "react";
import Image from "next/image";
import { PlusCircle, MinusCircle, X, CreditCard, Landmark, CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";


const products = [
  { id: 1, name: "Chocolate Cake", price: 25.00, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'chocolate cake' },
  { id: 2, name: "Croissant", price: 4.50, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'croissant pastry' },
  { id: 3, name: "Sourdough Bread", price: 8.00, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'sourdough bread' },
  { id: 4, name: "Vanilla Cupcake", price: 3.75, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'vanilla cupcake' },
  { id: 5, name: "Baguette", price: 5.00, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'baguette bread' },
  { id: 6, name: "Cinnamon Roll", price: 5.50, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'cinnamon roll' },
  { id: 7, name: "Red Velvet Cake", price: 30.00, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'red velvet' },
  { id: 8, name: "Blueberry Muffin", price: 4.00, image: "https://placehold.co/300x200.png", 'data-ai-hint': 'blueberry muffin' },
];

const customers = [
    { id: 'cust_1', name: 'John Doe', email: 'john.doe@example.com' },
    { id: 'cust_2', name: 'Jane Smith', email: 'jane.smith@example.com' },
    { id: 'cust_3', name: 'Walk-in Customer', email: '' },
]

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: typeof products[0]) => {
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

  const updateQuantity = (productId: number, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.075; // 7.5% VAT
  const total = subtotal + tax;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      {/* Products Section */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline">Products</CardTitle>
            <CardDescription>Select products to add to the order</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-full pr-4">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                    <Card
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                    >
                    <CardContent className="p-0 relative">
                        <Image
                        src={product.image}
                        alt={product.name}
                        width={300}
                        height={200}
                        className="rounded-t-lg object-cover"
                        data-ai-hint={product['data-ai-hint']}
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors rounded-t-lg" />
                    </CardContent>
                    <CardFooter className="p-3 flex flex-col items-start">
                        <h3 className="font-semibold text-sm">{product.name}</h3>
                        <p className="text-sm text-primary">₦{product.price.toFixed(2)}</p>
                    </CardFooter>
                    </Card>
                ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Order Summary Section */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline">Current Order</CardTitle>
            <div className="flex items-center gap-2 pt-2">
                <CircleUser className="w-5 h-5 text-muted-foreground" />
                <Select defaultValue="cust_3">
                    <SelectTrigger>
                        <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>
                    <SelectContent>
                        {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-[300px] pr-2">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No items in cart</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <Image
                        src={products.find(p => p.id === item.id)?.image || ''}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                        data-ai-hint={products.find(p => p.id === item.id)?.['data-ai-hint']}
                      />
                      <div className="flex-grow">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">₦{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                       <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => updateQuantity(item.id, 0)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          {cart.length > 0 && (
            <CardFooter className="flex-col !items-stretch gap-4 border-t pt-6">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₦{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT (7.5%)</span>
                        <span>₦{tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₦{total.toFixed(2)}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" variant="outline">
                        <Landmark className="mr-2 h-4 w-4" />
                        Cash
                    </Button>
                    <Button size="lg">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay with Card
                    </Button>
                </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
