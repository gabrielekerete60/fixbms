
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Plus, Minus, X, Search, Trash2, Hand, CreditCard, Wallet, Printer, User, Building, Loader2 } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  'data-ai-hint': string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CompletedOrder = {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  paymentMethod: 'Card' | 'Paystack';
  customerName?: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

export default function POSPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useLocalStorage<CartItem[][]>('heldOrders', []);
  const [activeTab, setActiveTab] = useState('All');
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [customerName, setCustomerName] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConfirmCashOpen, setIsConfirmCashOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<CompletedOrder | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, "products");
        const productSnapshot = await getDocs(productsCollection);
        const productsList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch products from the database.",
        });
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [toast]);


  const categories = ['All', ...new Set(products.map(p => p.category))];

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
  const tax = useMemo(() => subtotal * 0.075, [subtotal]); // 7.5% VAT
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  
  const filteredProducts = useMemo(() => {
    if (activeTab === 'All') return products;
    return products.filter(p => p.category === activeTab);
  }, [activeTab, products]);


  const addToCart = (product: Product) => {
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
      return [...prevCart, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
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
    setCustomerName('');
    toast({
        title: "Cart Cleared",
        description: "All items have been removed from the cart.",
    });
  };

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [...prev, cart]);
    setCart([]);
    setCustomerName('');
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

  const completeOrder = async (paymentMethod: 'Card' | 'Paystack') => {
    const newOrderData = {
      items: cart,
      subtotal,
      tax,
      total,
      date: new Date().toISOString(),
      paymentMethod,
      customerName: customerName || 'Walk-in',
      status: 'Completed' as const
    };
  
    try {
      // In a real app, this would also update stock levels in the database in a transaction.
      const docRef = await addDoc(collection(db, "orders"), newOrderData);
      
      const newOrder: CompletedOrder = {
        id: docRef.id,
        ...newOrderData,
      };
      
      setLastCompletedOrder(newOrder);
      setCart([]);
      setCustomerName('');
      return newOrder;
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: "There was a problem saving the order to the database.",
      });
      return null;
    }
  }

  const handleCardPayment = async () => {
    const completed = await completeOrder('Card');
    if (completed) {
      setIsConfirmCashOpen(false);
      setIsReceiptOpen(true);
      toast({
        title: "Order Completed",
        description: "The order has been successfully processed.",
      });
    }
  }

  const onPaystackSuccess = async (reference: any) => {
    console.log("Paystack Success!", reference);
    const completed = await completeOrder('Paystack');
    if (completed) {
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      toast({
        title: "Payment Successful",
        description: "The order has been successfully processed.",
      });
    }
  };

  const onPaystackClose = () => {
    console.log('Paystack dialog closed.');
    toast({
      variant: 'destructive',
      title: "Payment Cancelled",
      description: "The payment process was cancelled.",
    })
  };
  
  const handlePrintReceipt = () => {
    window.print();
  }
  
  const PaystackButton = () => {
    const paystackConfig = {
        reference: (new Date()).getTime().toString(),
        email: "customer@example.com",
        amount: Math.round(total * 100),
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const handlePaystackPayment = () => {
      console.log("Initializing Paystack with config:", paystackConfig);
      if (!paystackConfig.publicKey) {
        console.error("Paystack public key is not configured.");
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: "Paystack is not set up correctly. Please contact support.",
        });
        return;
      }
      setIsCheckoutOpen(false);
      initializePayment({onSuccess: onPaystackSuccess, onClose: onPaystackClose});
    };

    return (
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={handlePaystackPayment}>
            <Wallet className="w-8 h-8"/>
            <span>Pay with Paystack</span>
        </Button>
    )
  }


  return (
     <>
     <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-6 h-[calc(100vh_-_8rem)] print:hidden">
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
                      {isLoadingProducts ? (
                         <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                      ) : (
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
                      )}
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
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant={customerType === 'walk-in' ? 'default' : 'outline'} onClick={() => setCustomerType('walk-in')}>
                        <User className="mr-2 h-4 w-4" />
                        Walk-in
                    </Button>
                    <Button variant={customerType === 'registered' ? 'default' : 'outline'} onClick={() => setCustomerType('registered')}>
                        <Building className="mr-2 h-4 w-4" />
                        Registered
                    </Button>
                 </div>
                 {customerType === 'walk-in' && (
                     <div className="space-y-1.5">
                        <Label htmlFor="customer-name">Customer Name (Optional)</Label>
                        <Input id="customer-name" placeholder="Enter name for walk-in" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>
                 )}
                 {customerType === 'registered' && (
                     <div className="space-y-1.5">
                        <Label htmlFor="customer-search">Search Registered Customer</Label>
                         <Input id="customer-search" placeholder="Search by name or phone..." />
                     </div>
                 )}
            </div>
            <Separator />
          
          <ScrollArea className="flex-grow -mr-4 pr-4 mb-4 min-h-[150px]">
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
             <Button size="lg" className="w-full font-bold text-lg" disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)}>
                Checkout
             </Button>
        </CardFooter>
      </Card>
      </div>

       {/* ---- DIALOGS ---- */}

       {/* Checkout Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Payment</DialogTitle>
                    <DialogDescription>
                        Select a payment method to complete the transaction for <strong>₦{total.toFixed(2)}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => { setIsCheckoutOpen(false); setIsConfirmCashOpen(true); }}>
                        <CreditCard className="w-8 h-8"/>
                        <span>Pay with Card</span>
                    </Button>
                    <PaystackButton />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Confirm Cash Received Dialog */}
         <AlertDialog open={isConfirmCashOpen} onOpenChange={setIsConfirmCashOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                <AlertDialogDescription>
                    Have you received the total amount of <strong>₦{total.toFixed(2)}</strong> in cash or via the POS terminal?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>No, Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCardPayment}>Yes, I have</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Receipt Dialog */}
        {lastCompletedOrder && (
            <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
                <DialogContent className="sm:max-w-md print:max-w-full print:border-none print:shadow-none">
                     <DialogHeader>
                        <DialogTitle className="font-headline text-2xl text-center">BMS</DialogTitle>
                        <DialogDescription className="text-center">
                            Sale Receipt
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="text-sm text-muted-foreground">
                            <p><strong>Order ID:</strong> {lastCompletedOrder.id}</p>
                            <p><strong>Date:</strong> {new Date(lastCompletedOrder.date).toLocaleString()}</p>
                            <p><strong>Payment Method:</strong> {lastCompletedOrder.paymentMethod}</p>
                             <p><strong>Customer:</strong> {lastCompletedOrder.customerName || 'Walk-in'}</p>
                        </div>
                        <Separator />
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lastCompletedOrder.items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₦{(item.price * item.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Separator />
                         <div className="w-full space-y-1 text-sm pr-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">₦{lastCompletedOrder.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax (7.5%)</span>
                                <span className="font-medium">₦{lastCompletedOrder.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base mt-1">
                                <span>Total</span>
                                <span>₦{lastCompletedOrder.total.toFixed(2)}</span>
                            </div>
                        </div>
                        <Separator />
                        <p className="text-center text-xs text-muted-foreground">Thank you for your patronage!</p>
                    </div>
                    <div className="flex justify-end gap-2 print:hidden">
                        <Button variant="outline" onClick={handlePrintReceipt}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                        <Button onClick={() => setIsReceiptOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        )}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-receipt, .print-receipt * {
              visibility: visible;
            }
            .print-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
         {isReceiptOpen && lastCompletedOrder && (
          <div className="hidden print:block print-receipt">
            <div className="bg-white text-black p-8">
              <h2 className="font-headline text-3xl text-center mb-2">BMS</h2>
              <p className="text-center mb-4">Sale Receipt</p>
              <div className="text-sm mb-4">
                  <p><strong>Order ID:</strong> {lastCompletedOrder.id}</p>
                  <p><strong>Date:</strong> {new Date(lastCompletedOrder.date).toLocaleString()}</p>
                  <p><strong>Payment Method:</strong> {lastCompletedOrder.paymentMethod}</p>
              </div>
              <table className="w-full text-sm">
                  <thead>
                      <tr className="border-b">
                          <th className="text-left pb-1">Item</th>
                          <th className="text-center pb-1">Qty</th>
                          <th className="text-right pb-1">Amount</th>
                      </tr>
                  </thead>
                  <tbody>
                      {lastCompletedOrder.items.map(item => (
                      <tr key={item.id} className="border-b">
                          <td className="py-1">{item.name}</td>
                          <td className="text-center py-1">{item.quantity}</td>
                          <td className="text-right py-1">₦{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                      ))}
                  </tbody>
              </table>
              <div className="w-full mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₦{lastCompletedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                      <span>Tax (7.5%)</span>
                      <span>₦{lastCompletedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base mt-1">
                      <span>Total</span>
                      <span>₦{lastCompletedOrder.total.toFixed(2)}</span>
                  </div>
              </div>
              <p className="text-center text-xs mt-6">Thank you for your patronage!</p>
            </div>
          </div>
        )}
     </>
  );
}
