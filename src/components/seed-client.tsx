

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
    clearDatabase,
    verifySeedPassword,
    seedUsersAndConfig,
    seedProductsAndIngredients,
    seedCustomersAndSuppliers,
    seedFinancialRecords,
    seedOperationalData,
    seedCommunicationData
} from "@/app/seed/actions";
import { Loader2, KeyRound } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SeedAction = {
    name: string;
    action: () => Promise<{ success: boolean; error?: string }>;
};

export function SeedClient() {
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

  const seedActions: SeedAction[] = [
    { name: "Users & Config", action: seedUsersAndConfig },
    { name: "Products & Recipes", action: seedProductsAndIngredients },
    { name: "Customers & Suppliers", action: seedCustomersAndSuppliers },
    { name: "Financial Records", action: seedFinancialRecords },
    { name: "Operational Data (Orders etc.)", action: seedOperationalData },
    { name: "Communication (Announcements etc.)", action: seedCommunicationData },
  ];

  if (!isVerified) {
    return (
       <div className="flex flex-col space-y-4">
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
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Incremental Seeding</h3>
        <p className="text-sm text-muted-foreground">Seed data in smaller chunks to avoid server timeouts.</p>
        <div className="grid grid-cols-2 gap-2">
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
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Database Management</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isPending} className="w-full font-headline">
              {currentlySeeding === "clear" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Clear Entire Database
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="font-body">
                This action cannot be undone. This will permanently delete all data from all collections in the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleSeedAction("clear", clearDatabase)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, clear database
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
