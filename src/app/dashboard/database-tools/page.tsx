
"use client";

import { useState, useTransition } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
    clearCollection,
    seedUsersAndConfig,
    seedProductsAndIngredients,
    seedCustomersAndSuppliers,
    seedFinancialRecords,
    seedOperationalData,
    seedCommunicationData,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [isPending, startTransition] = useTransition();
  const [currentlySeeding, setCurrentlySeeding] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSeedAction = (actionName: string, actionFn: () => Promise<{ success: boolean; error?: string }>) => {
    setCurrentlySeeding(actionName);
    startTransition(async () => {
      const result = await actionFn();
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
    });
  };

  const handleClearCollection = (collectionName: string) => {
    setCurrentlySeeding(collectionName);
    startTransition(async () => {
        const result = await clearCollection(collectionName);
        if (result.success) {
            toast({ title: "Success!", description: `Collection "${collectionName}" cleared.`});
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setCurrentlySeeding(null);
    });
  }

  const seedActions = [
    { name: "Users & Config", action: seedUsersAndConfig },
    { name: "Products & Recipes", action: seedProductsAndIngredients },
    { name: "Customers & Suppliers", action: seedCustomersAndSuppliers },
    { name: "Financial Records", action: seedFinancialRecords },
    { name: "Operational Data", action: seedOperationalData },
    { name: "Communication Data", action: seedCommunicationData },
  ];

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-headline">Database Tools</h1>
            <Button variant="outline" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</Link>
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Incremental Seeding</CardTitle>
                    <CardDescription>Seed data in smaller chunks to avoid server timeouts.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                     {seedActions.map(({ name, action }) => (
                        <Button 
                            key={name}
                            variant="secondary" 
                            onClick={() => handleSeedAction(name, action)}
                            disabled={isPending}
                            className="text-xs h-12"
                        >
                            {currentlySeeding === name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4"/>}
                            Seed {name}
                        </Button>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
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
