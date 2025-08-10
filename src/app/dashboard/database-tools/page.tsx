

"use client";

import { useState } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
    clearCollection,
    seedUsersAndConfig,
    seedProductsAndIngredients,
    seedCustomersAndSuppliers,
    seedFinancialRecords,
    seedOperationalData,
    seedCommunicationData,
    clearAllData,
    seedFullData
} from "@/app/seed/actions";
import { Loader2, DatabaseZap, Trash2, ArrowLeft } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";


const collectionsToClear = [
    "products", "staff", "recipes", "promotions", "suppliers", 
    "ingredients", "other_supplies", "customers", "orders", "transfers", 
    "production_batches", "waste_logs", "attendance", "sales", "debt", 
    "directCosts", "indirectCosts", "wages", "closingStocks", 
    "discount_records", "announcements", "reports", "cost_categories",
    "payment_confirmations", "supply_requests", "ingredient_stock_logs",
    "production_logs", "settings"
];


export default function DatabaseToolsPage() {
  const [isPending, startTransition] = useState(false);
  const [currentlySeeding, setCurrentlySeeding] = useState<string | null>(null);
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState('');

  const handleVerification = () => {
    if (password === 'password123') {
        setIsVerified(true);
        toast({ title: "Access Granted", description: "Database tools unlocked." });
    } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Incorrect password." });
    }
  };


  const handleSeedAction = (actionName: string, actionFn: () => Promise<{ success: boolean; error?: string }>) => {
    setCurrentlySeeding(actionName);
    startTransition(true);
    actionFn().then(result => {
      if (result.success) {
        toast({
          title: "Success!",
          description: `${actionName} completed successfully.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || `An error occurred during ${actionName}.`,
        });
      }
      setCurrentlySeeding(null);
      startTransition(false);
    });
  };

  const handleClearCollection = (collectionName: string) => {
    setCurrentlySeeding(collectionName);
    startTransition(true);
    clearCollection(collectionName).then(result => {
        if (result.success) {
            toast({ title: "Success!", description: `Collection "${collectionName}" cleared.`});
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setCurrentlySeeding(null);
        startTransition(false);
    });
  }
  
  if (!isVerified) {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Verification Required</CardTitle>
                <CardDescription>Enter the password to access the database tools.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="db-password">Password</Label>
                    <Input 
                        id="db-password" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                    <Link href="/">Cancel</Link>
                </Button>
                <Button onClick={handleVerification}>Verify</Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-headline">Database Tools</h1>
            <Button variant="outline" asChild>
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Login</Link>
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Seed Data</CardTitle>
                    <CardDescription>Seed the database with demo data incrementally.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button 
                        variant="secondary"
                        onClick={() => handleSeedAction("Full Database", seedFullData)}
                        disabled={isPending}
                        className="w-full"
                    >
                        {currentlySeeding === "Full Database" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4"/>}
                        Seed Full Demo Data
                    </Button>
                    <Separator className="my-2" />
                     <div className="grid grid-cols-2 gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => handleSeedAction("Users & Config", seedUsersAndConfig)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === "Users & Config" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            1. Seed Users & Config
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handleSeedAction("Products & Recipes", seedProductsAndIngredients)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === "Products & Recipes" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            2. Seed Products & Recipes
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handleSeedAction("Customers & Suppliers", seedCustomersAndSuppliers)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === "Customers & Suppliers" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            3. Seed Customers & Suppliers
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handleSeedAction("Financial Records", seedFinancialRecords)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === "Financial Records" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            4. Seed Financial Records
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handleSeedAction("Operational Data", seedOperationalData)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === "Operational Data" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            5. Seed Operational Data
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => handleSeedAction("Communication Data", seedCommunicationData)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === "Communication Data" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            6. Seed Communication Data
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full" disabled={isPending}>
                                {currentlySeeding === "clear_all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Clear All Database Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all data from all collections. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSeedAction("clear_all", clearAllData)} className="bg-destructive hover:bg-destructive/90">Yes, Clear Everything</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <Separator className="my-4" />

                    <h4 className="font-semibold text-sm">Clear Individual Collections</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                       {collectionsToClear.map(name => (
                         <AlertDialog key={name}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-auto py-3 text-xs" disabled={isPending}>
                                    {currentlySeeding === name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    {name}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Clear "{name}" collection?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all documents in the "{name}" collection. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleClearCollection(name)} className="bg-destructive hover:bg-destructive/90">Yes, Clear</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                       ))}
                    </div>
                 </CardContent>
            </Card>
        </div>
    </div>
  );
}
