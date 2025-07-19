
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package2, Calendar as CalendarIcon, Car, TrendingUp } from 'lucide-react';
import { getSalesRuns } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { SalesRun as SalesRunType } from '@/app/actions';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { db } from '@/lib/firebase';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

function EmptyState({ title, description }: { title: string, description: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <Package2 className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold">{title}</h3>
            <p>{description}</p>
        </div>
    );
}

function RunCard({ run, user }: { run: SalesRunType, user: {name: string, staff_id: string} | null }) {
    const totalItems = run.items.reduce((sum, item) => sum + item.quantity, 0);
    const soldItems = 0; // Placeholder for now
    const progress = totalItems > 0 ? (soldItems / totalItems) * 100 : 0;
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Car /> Run: {run.id.substring(0, 6).toUpperCase()}
                    </CardTitle>
                    <CardDescription>Driver: {user?.name}</CardDescription>
                </div>
                <Badge>Active</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Sales Progress</span>
                        <span>{soldItems} / {totalItems} items</span>
                    </div>
                    <Progress value={progress} />
                </div>
                <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Total Revenue:</span><span className="font-semibold">₦{run.totalRevenue.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Collected:</span><span className="font-semibold text-green-500">₦{run.totalCollected.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Outstanding:</span><span className="font-semibold text-destructive">₦{run.totalOutstanding.toLocaleString()}</span></div>
                </div>
                <Link href={`/dashboard/sales-runs/${run.id}`} passHref>
                    <Button className="w-full">Manage Run</Button>
                </Link>
            </CardContent>
        </Card>
    );
}

function CompletedRunCard({ run }: { run: SalesRunType }) {
    const runDate = run.date ? new Date(run.date) : new Date();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Run ID: {run.id.substring(0, 7)}...</CardTitle>
                <CardDescription>
                    Assigned on {runDate.toLocaleString()} by {run.from_staff_name || 'Storekeeper'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>{run.items.reduce((sum, item) => sum + item.quantity, 0)} items delivered.</p>
                {run.notes && <p className="mt-2 text-sm text-muted-foreground italic">Notes: {run.notes}</p>}
            </CardContent>
        </Card>
    );
}

export default function DeliveriesPage() {
    const [user, setUser] = useState<{name: string, staff_id: string} | null>(null);
    const [activeRuns, setActiveRuns] = useState<SalesRunType[]>([]);
    const [completedRuns, setCompletedRuns] = useState<SalesRunType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>();
    const { toast } = useToast();

    const fetchRuns = useCallback(async (userId: string) => {
        setIsLoading(true);
        try {
            const { active, completed } = await getSalesRuns(userId);
            setActiveRuns(active);
            setCompletedRuns(completed);
        } catch (error) {
            console.error("Error fetching runs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch sales runs.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const filteredCompletedRuns = useMemo(() => {
        if (!date?.from) {
            return completedRuns;
        }
        const from = startOfDay(date.from);
        const to = date.to ? endOfDay(date.to) : endOfDay(date.from);

        return completedRuns.filter(run => {
            if (!run.date) return false;
            const runDate = new Date(run.date);
            return runDate >= from && runDate <= to;
        });
    }, [completedRuns, date]);

    useEffect(() => {
        const userStr = localStorage.getItem('loggedInUser');
        if (userStr) {
            const parsedUser = JSON.parse(userStr);
            setUser(parsedUser);
            if (parsedUser.staff_id) {
                fetchRuns(parsedUser.staff_id);
            }
        } else {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user.' });
             setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleFocus = () => {
            if (user?.staff_id) {
                fetchRuns(user.staff_id);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, fetchRuns]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Field Sales Runs</h1>

            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">Active Runs ({activeRuns.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed Runs ({filteredCompletedRuns.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : activeRuns.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeRuns.map(run => <RunCard key={run.id} run={run} user={user} />)}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6">
                                <EmptyState title="No Active Sales Runs" description="Accepted sales runs will appear here." />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="completed" className="mt-4">
                    <div className="flex justify-end mb-4">
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
                                <span>Filter by date</span>
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
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredCompletedRuns.length > 0 ? (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredCompletedRuns.map(run => <CompletedRunCard key={run.id} run={run} />)}
                        </div>
                    ) : (
                       <Card>
                            <CardContent className="p-6">
                                <EmptyState title="No Completed Runs" description="Your completed sales runs will appear here." />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
