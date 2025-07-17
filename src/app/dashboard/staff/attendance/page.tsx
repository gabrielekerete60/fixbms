
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold font-headline">Attendance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Staff Attendance</CardTitle>
          <CardDescription>
            This page is under construction. Staff attendance records and clock-in/out functionality will be available here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Attendance records will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
