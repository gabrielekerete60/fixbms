
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

export default function StockControlPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-6 w-6" />
        <h1 className="text-2xl font-bold font-headline">Stock Control</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stock Control Center</CardTitle>
          <CardDescription>
            This page is under construction. It will contain tools for stock takes, adjustments, and monitoring inventory levels.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Stock control features will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
