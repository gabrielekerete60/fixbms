"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { handleLogin } from "./actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await handleLogin(formData);

    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/dashboard");
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.error,
      });
    }
    
    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background transition-colors duration-500">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-background to-secondary/20 -z-10" />
      <Card className="w-full max-w-sm shadow-2xl bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">Sweet Track</CardTitle>
          <CardDescription className="font-body">Welcome back! Please log in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="staff_id" className="font-headline text-primary-foreground/80">Staff ID</Label>
                <Input id="staff_id" name="staff_id" placeholder="Your 6-character ID" maxLength={6} className="transition-all duration-300 focus:bg-background" required />
              </div>
              <div className="flex flex-col space-y-1.5 relative">
                <Label htmlFor="password" className="font-headline text-primary-foreground/80">Password</Label>
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Your password" className="transition-all duration-300 focus:bg-background" required/>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-primary transition-colors duration-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" name="remember-me" />
                <Label htmlFor="remember-me" className="text-sm font-normal font-body">Remember me</Label>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" form="login-form" className="w-full font-headline" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Need to set up the database?{" "}
            <Link href="/seed" className="underline hover:text-primary transition-colors">
              Continue to seed data
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}