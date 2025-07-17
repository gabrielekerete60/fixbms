
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Users, Loader2 } from "lucide-react";
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfWeek } from "date-fns";

const chartConfig = {
  days: {
    label: "Days",
    color: "hsl(var(--chart-1))",
  },
};

type AttendanceRecord = {
    id: string;
    staff_id: string;
    staff_name: string;
    clock_in_time: Timestamp;
    clock_out_time: Timestamp | null;
}

type WeeklyAttendance = {
    name: string;
    days: number;
}

export default function AttendancePage() {
  const [presentStaff, setPresentStaff] = useState<AttendanceRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const fetchAttendance = async () => {
        setIsLoading(true);
        
        try {
            const staffSnapshot = await getDocs(query(collection(db, 'staff'), where('role', '!=', 'Developer')));
            const staffMap = new Map(staffSnapshot.docs.map(doc => [doc.id, doc.data().name]));

            // Fetch today's attendance
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);

            const todayQuery = query(
                collection(db, "attendance"),
                where("clock_in_time", ">=", Timestamp.fromDate(todayStart)),
                where("clock_in_time", "<", Timestamp.fromDate(tomorrowStart))
            );
            const todayAttendanceSnapshot = await getDocs(todayQuery);
            const todayRecords = todayAttendanceSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    staff_name: staffMap.get(data.staff_id) || 'Unknown Staff'
                } as AttendanceRecord
            });
            setPresentStaff(todayRecords);

            // Fetch this week's attendance for the chart
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
            const weekQuery = query(
                collection(db, "attendance"),
                where("clock_in_time", ">=", Timestamp.fromDate(weekStart))
            );
            const weekAttendanceSnapshot = await getDocs(weekQuery);
            
            const attendanceByStaff: { [staffId: string]: Set<string> } = {};

            weekAttendanceSnapshot.docs.forEach(doc => {
                const record = doc.data();
                const date = record.clock_in_time.toDate().toISOString().split('T')[0];
                if (!attendanceByStaff[record.staff_id]) {
                    attendanceByStaff[record.staff_id] = new Set();
                }
                attendanceByStaff[record.staff_id].add(date);
            });
            
            const chartData = Array.from(staffMap.entries())
                .map(([staffId, name]) => ({
                    name: name.split(' ')[0], // Use first name for chart
                    days: attendanceByStaff[staffId]?.size || 0,
                }));

            setWeeklyData(chartData);

        } catch (error) {
            console.error("Error fetching attendance: ", error);
        } finally {
            setIsLoading(false);
        }
    }

    fetchAttendance();
  }, []);

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
                {isLoading ? (
                     <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : presentStaff.length > 0 ? (
                    presentStaff.map(record => (
                        <TableRow key={record.id}>
                            <TableCell>{record.staff_name}</TableCell>
                            <TableCell>{format(record.clock_in_time.toDate(), 'p')}</TableCell>
                            <TableCell>
                                {record.clock_out_time ? format(record.clock_out_time.toDate(), 'p') : 'Still clocked in'}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No staff have clocked in yet today.
                        </TableCell>
                    </TableRow>
                )}
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
             {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart
                        accessibilityLayer
                        data={weeklyData}
                        margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                        dataKey="name"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        />
                         <YAxis 
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            allowDecimals={false}
                            domain={[0, 5]}
                         />
                        <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="days" fill="var(--color-days)" radius={4} />
                    </BarChart>
                </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
