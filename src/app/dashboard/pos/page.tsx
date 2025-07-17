
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Plus, Minus, X, Search, Trash2, Hand, CreditCard, Wallet } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";


const initialProducts = [
  // Breads
  { id: 1, name: "Family Loaf", price: 550.00, stock: 50, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf' },
  { id: 2, name: "Burger Loaf", price: 450.00, stock: 30, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun' },
  { id: 3, name: "Jumbo Loaf", price: 900.00, stock: 25, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread' },
  { id: 4, name: "Round Loaf", price: 500.00, stock: 40, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread' },
  // Drinks
  { id: 5, name: "Coca-Cola (50cl)", price: 300.00, stock: 100, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola' },
  { id: 6, name: "Bottled Water (75cl)", price: 200.00, stock: 150, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water' },
  { id: 7, name: "Pepsi (50cl)", price: 300.00, stock: 90, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'pepsi can' },
  { id: 8, name: "Sprite (50cl)", price: 300.00, stock: 0, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'sprite can' },
];


type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function POSPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<CartItem[][]>([]);
  const [activeTab, setActiveTab] = useState('All');

  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = useMemo(() => {
    if (activeTab === 'All') return products;
    return products.filter(p => p.category === activeTab);
  }, [activeTab, products]);


  const addToCart = (product: typeof products[0]) => {
    if (product.stock === 0) {
      toast({
        variant: "destructive",
        title: "Out of Stock",
        description: `${product.name} is currently unavailable.`,
      });
      return;
    };
    
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
  
  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    toast({
        title: "Cart Cleared",
        description: "All items have been removed from the cart.",
    });
  };

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [...prev, cart]);
    setCart([]);
     toast({
        title: "Order Held",
        description: "The current cart has been saved.",
    });
  }

  const resumeOrder = (orderIndex: number) => {
    if (cart.length > 0) {
       toast({
        variant: "destructive",
        title: "Cart is not empty",
        description: "Please clear or complete the current order before resuming another.",
      });
      return;
    }
    const orderToResume = heldOrders[orderIndex];
    setCart(orderToResume);
    setHeldOrders(prev => prev.filter((_, index) => index !== orderIndex));
    setActiveTab('All');
  }

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.075; // 7.5% VAT
  const total = subtotal + tax;
  
  return (
     <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-6 h-[calc(100vh_-_8rem)]">
      {/* Products Section */}
      <Card className="flex flex-col">
        <CardContent className="p-4 flex flex-col gap-4 flex-grow">
          <header className="flex justify-between items-center">
              <h1 className="text-2xl font-bold font-headline">Point of Sale</h1>
               <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search products..." className="pl-10 w-64" />
                </div>
          </header>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                  {categories.map(category => (
                      <TabsTrigger key={category} value={category}>
                          {category}
                      </TabsTrigger>
                  ))}
                  <TabsTrigger value="held-orders" className="flex gap-2">
                      Held Orders <Badge>{heldOrders.length}</Badge>
                  </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4 flex-grow">
                  <ScrollArea className="h-[calc(100vh_-_22rem)]">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-4">
                        {filteredProducts.map((product) => (
                            <Card
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className={`cursor-pointer hover:shadow-lg transition-shadow group relative overflow-hidden ${product.stock === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <CardContent className="p-0">
                                  <Image
                                  src={product.image}
                                  alt={product.name}
                                  width={150}
                                  height={150}
                                  className="rounded-t-lg object-cover w-full aspect-square transition-transform group-hover:scale-105"
                                  data-ai-hint={product['data-ai-hint']}
                                  />
                                  <Badge variant="secondary" className="absolute top-2 right-2">
                                      Stock: {product.stock}
                                  </Badge>
                                  {product.stock === 0 && (
                                      <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-lg">
                                          <p className="font-bold text-lg text-destructive">Out of Stock</p>
                                      </div>
                                  )}
                              </CardContent>
                              <CardFooter className="p-3 flex flex-col items-start bg-muted/50">
                                  <h3 className="font-semibold text-sm">{product.name}</h3>
                                  <p className="text-sm text-primary font-bold">₦{product.price.toFixed(2)}</p>
                              </CardFooter>
                            </Card>
                        ))}
                      </div>
                  </ScrollArea>
              </TabsContent>
               <TabsContent value="held-orders" className="mt-4">
                  <ScrollArea className="h-[calc(100vh_-_22rem)]">
                    {heldOrders.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No orders on hold.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pr-4">
                        {heldOrders.map((heldCart, index) => (
                           <Card key={index} className="p-2 flex justify-between items-center">
                              <div>
                                <p className="font-semibold">Held Order #{index + 1}</p>
                                <p className="text-sm text-muted-foreground">{heldCart.length} items - Total: ₦{heldCart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</p>
                              </div>
                              <Button size="sm" onClick={() => resumeOrder(index)}>Resume</Button>
                           </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
               </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Summary Section */}
      <Card className="flex flex-col h-full">
        <CardContent className="p-4 flex flex-col gap-4 flex-grow">
          <h2 className="text-xl font-bold font-headline mb-2">Current Order</h2>
          
          <ScrollArea className="flex-grow -mr-4 pr-4 mb-4 min-h-[200px]">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Click on a product to add it to the order.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 text-sm">
                    <div className="flex-grow">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-muted-foreground">₦{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                     <p className="font-semibold w-16 text-right">₦{(item.price * item.quantity).toFixed(2)}</p>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive"
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

        <CardFooter className="p-4 flex flex-col gap-4 border-t bg-muted/20">
            <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₦{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (7.5%)</span>
                    <span className="font-medium">₦{tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₦{total.toFixed(2)}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" onClick={holdOrder} disabled={cart.length === 0}>
                    <Hand /> Hold
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={cart.length === 0}>
                            <Trash2/> Clear
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will clear all items from the current cart. This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearCart}>Yes, Clear Cart</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="lg" className="w-full font-bold text-lg" disabled={cart.length === 0}>
                        Checkout
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Complete Payment</AlertDialogTitle>
                    <AlertDialogDescription>
                        Select a payment method to complete the transaction for <strong>₦{total.toFixed(2)}</strong>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Button variant="outline" className="h-20 flex-col gap-2">
                           <CreditCard className="w-8 h-8"/>
                           <span>Pay with Card</span>
                        </Button>
                         <Button variant="outline" className="h-20 flex-col gap-2">
                           <Wallet className="w-8 h-8"/>
                           <span>Pay with Paystack</span>
                        </Button>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}

