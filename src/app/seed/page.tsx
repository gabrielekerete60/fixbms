import { SeedClient } from "@/components/seed-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SeedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
       <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary">Database Tools</CardTitle>
          <CardDescription className="font-body">
            Use these tools to manage the Firestore database. Be careful, these actions are irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeedClient />
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm inline-flex items-center gap-2 hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4"/>
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
