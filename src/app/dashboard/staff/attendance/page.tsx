
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle, Users, Loader2, Calendar as CalendarIcon } from "lucide-react";
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
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfWeek, endOfDay, startOfDay, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";


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
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>();
  const [logStatusFilter, setLogStatusFilter] = useState<"all" | "in" | "out">("all");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    
    try {
        const staffQuery = query(collection(db, 'staff'), where('role', '!=', 'Developer'));
        const staffSnapshot = await getDocs(staffQuery);
        const staffMap = new Map(staffSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        // Fetch today's attendance for "Present Today" card
        const todayStart = startOfDay(new Date());
        
        const todayQuery = query(
            collection(db, "attendance"),
            where("clock_in_time", ">=", Timestamp.fromDate(todayStart)),
            where("clock_out_time", "==", null) // Only show those still clocked in
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
        
        // Fetch all attendance for logs
        const allAttendanceQuery = query(collection(db, 'attendance'), orderBy('clock_in_time', 'desc'));
        const allAttendanceSnapshot = await getDocs(allAttendanceQuery);
        const allRecords = allAttendanceSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                staff_name: staffMap.get(data.staff_id) || 'Unknown Staff'
            } as AttendanceRecord
        });
        setAllAttendance(allRecords);


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
            const dateStr = record.clock_in_time.toDate().toISOString().split('T')[0];
            if (!attendanceByStaff[record.staff_id]) {
                attendanceByStaff[record.staff_id] = new Set();
            }
            attendanceByStaff[record.staff_id].add(dateStr);
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
  }, []);

  const filteredLogs = useMemo(() => {
    let logs = allAttendance;

    if (date?.from) {
      const from = startOfDay(date.from);
      const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
      logs = logs.filter(log => {
          const logDate = log.clock_in_time.toDate();
          return logDate >= from && logDate <= to;
      });
    }

    if (logStatusFilter === 'in') {
      return logs.filter(log => log.clock_out_time === null);
    }
    if (logStatusFilter === 'out') {
      return logs.filter(log => log.clock_out_time !== null);
    }
    
    return logs;
  }, [allAttendance, date, logStatusFilter]);

  useEffect(() => {
    fetchAttendance();
    window.addEventListener('attendanceChanged', fetchAttendance);
    window.addEventListener('focus', fetchAttendance);
    
    return () => {
        window.removeEventListener('attendanceChanged', fetchAttendance);
        window.removeEventListener('focus', fetchAttendance);
    }
  }, [fetchAttendance]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold font-headline">Staff Attendance</h1>

        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="logs">Attendance Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="text-green-500" />
                        Present Today
                        </CardTitle>
                        <CardDescription>
                        Staff members currently clocked in on {today}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Staff Member</TableHead>
                            <TableHead>Clock-in Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : presentStaff.length > 0 ? (
                                presentStaff.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>{record.staff_name}</TableCell>
                                        <TableCell>{format(record.clock_in_time.toDate(), 'p')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        No staff are currently clocked in.
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
            </TabsContent>
             <TabsContent value="logs" className="mt-4">
                <Card>
                     <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                               <CardTitle>Attendance Log</CardTitle>
                               <CardDescription>A complete history of all clock-in and clock-out events.</CardDescription>
                            </div>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-[260px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                    date.to ? (
                                        <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Tabs value={logStatusFilter} onValueChange={(value) => setLogStatusFilter(value as any)} className="mt-4">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="in">Clocked In</TabsTrigger>
                                <TabsTrigger value="out">Clocked Out</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Clock-in</TableHead>
                                    <TableHead>Clock-out</TableHead>
                                    <TableHead>Total Hours</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length > 0 ? (
                                    filteredLogs.map(record => {
                                        let hours = 'N/A';
                                        if (record.clock_out_time) {
                                            const diff = record.clock_out_time.toMillis() - record.clock_in_time.toMillis();
                                            hours = (diff / (1000 * 60 * 60)).toFixed(2);
                                        }
                                        return (
                                            <TableRow key={record.id}>
                                                <TableCell>{record.staff_name}</TableCell>
                                                <TableCell>{format(record.clock_in_time.toDate(), 'PPP')}</TableCell>
                                                <TableCell>{format(record.clock_in_time.toDate(), 'p')}</TableCell>
                                                <TableCell>
                                                    {record.clock_out_time ? format(record.clock_out_time.toDate(), 'p') : '--'}
                                                </TableCell>
                                                <TableCell>{hours}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No attendance records found for the selected period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
     
    </div>
  );
}
