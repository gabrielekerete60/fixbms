
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package2 } from 'lucide-react';
import { getSalesRuns, SalesRun } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <Package2 className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold">No Active Sales Runs</h3>
            <p>Acknowledged sales runs will appear here.</p>
        </div>
    );
}

function RunCard({ run }: { run: SalesRun }) {
    // This will be expanded later to show more details and actions
    return (
        <Card>
            <CardHeader>
                <CardTitle>Run ID: {run.id.substring(0, 7)}...</CardTitle>
                <CardDescription>
                    Assigned on {new Date(run.date.toDate()).toLocaleString()}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>{run.items.reduce((sum, item) => sum + item.quantity, 0)} items to deliver.</p>
            </CardContent>
        </Card>
    );
}

export default function DeliveriesPage() {
    const [activeRuns, setActiveRuns] = useState<SalesRun[]>([]);
    const [completedRuns, setCompletedRuns] = useState<SalesRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchRuns = useCallback(async () => {
        setIsLoading(true);
        const userStr = localStorage.getItem('loggedInUser');
        if (!userStr) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user.' });
            setIsLoading(false);
            return;
        }
        const user = JSON.parse(userStr);

        const { active, completed } = await getSalesRuns(user.staff_id);
        setActiveRuns(active);
        setCompletedRuns(completed);
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Field Sales Runs</h1>

            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">Active Runs</TabsTrigger>
                    <TabsTrigger value="completed">Completed Runs</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : activeRuns.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeRuns.map(run => <RunCard key={run.id} run={run} />)}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-6">
                                <EmptyState />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="completed" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : completedRuns.length > 0 ? (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {completedRuns.map(run => <RunCard key={run.id} run={run} />)}
                        </div>
                    ) : (
                       <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                                    <h3 className="text-xl font-semibold">No Completed Runs</h3>
                                    <p>Your completed sales runs will appear here.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
