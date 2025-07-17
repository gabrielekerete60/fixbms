
"use client";

import { CheckCircle, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartData = [
  { name: "Chris", days: 4 },
  { name: "Vic", days: 3 },
  { name: "Favour", days: 5 },
  { name: "Mfon", days: 4 },
  { name: "Akan", days: 5 },
  { name: "Jane", days: 2 },
  { name: "Blessing", days: 5 },
  { name: "John", days: 4 },
  { name: "David", days: 5 },
];

const chartConfig = {
  days: {
    label: "Days",
    color: "hsl(var(--chart-1))",
  },
};

export default function AttendancePage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold font-headline">Staff Attendance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              Present Today
            </CardTitle>
            <CardDescription>
              Staff members who have clocked in today, {today}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Clock-in Time</TableHead>
                  <TableHead>Clock-out Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No staff have clocked in yet today.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users />
              Weekly Attendance
            </CardTitle>
            <CardDescription>
              Number of days each staff member clocked in this week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="days" fill="var(--color-days)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
