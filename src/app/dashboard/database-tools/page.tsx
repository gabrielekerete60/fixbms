
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
    clearCollection,
    verifySeedPassword,
    seedUsersAndConfig,
    seedProductsAndIngredients,
    seedCustomersAndSuppliers,
    seedFinancialRecords,
    seedOperationalData,
    seedCommunicationData,
    collectionsToClear,
} from "@/app/seed/actions";
import { Loader2, KeyRound, DatabaseZap, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type SeedAction = {
    name: string;
    action: () => Promise<{ success: boolean; error?: string }>;
};

export default function DatabaseToolsPage() {
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerification] = useTransition();
  const [password, setPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [currentlySeeding, setCurrentlySeeding] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleVerify = () => {
    startVerification(async () => {
      const result = await verifySeedPassword(password);
      if (result.success) {
        setIsVerified(true);
        toast({
          title: "Verified!",
          description: "You can now use the database tools.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Invalid password.",
        });
      }
    });
  }

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

  const seedActions: SeedAction[] = [
    { name: "Users & Config", action: seedUsersAndConfig },
    { name: "Products & Recipes", action: seedProductsAndIngredients },
    { name: "Customers & Suppliers", action: seedCustomersAndSuppliers },
    { name: "Financial Records", action: seedFinancialRecords },
    { name: "Operational Data", action: seedOperationalData },
    { name: "Communication Data", action: seedCommunicationData },
  ];

  if (!isVerified) {
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Enter Admin Password</CardTitle>
                <CardDescription>You need an admin password to access these tools.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="seed-password">Admin Password</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            id="seed-password" 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter seed password"
                            className="pl-10"
                            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                        />
                    </div>
                </div>
                <Button onClick={handleVerify} disabled={isVerifying || !password} className="w-full font-headline">
                    {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify
                </Button>
            </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold font-headline">Database Tools</h1>
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
                            {currentlySeeding === name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
