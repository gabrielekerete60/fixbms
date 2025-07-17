
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PayrollPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold font-headline">Payroll</h1>
      <Card>
        <CardHeader>
          <CardTitle>Staff Payroll</CardTitle>
          <CardDescription>
            This page is under construction. Staff payroll, salary payments, and financial records will be available here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Payroll information will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
