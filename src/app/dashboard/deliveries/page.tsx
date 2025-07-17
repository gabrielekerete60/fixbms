
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package2 } from 'lucide-react';
import { getSalesRuns } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SalesRun as SalesRunType } from '@/app/actions';

function EmptyState({ title, description }: { title: string, description: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <Package2 className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold">{title}</h3>
            <p>{description}</p>
        </div>
    );
}

function RunCard({ run }: { run: SalesRunType }) {
    const runDate = run.date ? new Date(run.date.toDate()) : new Date();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Run ID: {run.id.substring(0, 7)}...</CardTitle>
                <CardDescription>
                    Assigned on {runDate.toLocaleString()} by {run.from_staff_name || 'Storekeeper'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>{run.items.reduce((sum, item) => sum + item.quantity, 0)} items to deliver.</p>
                {run.notes && <p className="mt-2 text-sm text-muted-foreground italic">Notes: {run.notes}</p>}
            </CardContent>
        </Card>
    );
}

export default function DeliveriesPage() {
    const [activeRuns, setActiveRuns] = useState<SalesRunType[]>([]);
    const [completedRuns, setCompletedRuns] = useState<SalesRunType[]>([]);
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

        try {
            const { active, completed } = await getSalesRuns(user.staff_id);

             // Fetch the initiator's name for each run
            const fetchInitiatorNames = async (runs: SalesRunType[]) => {
                const runsWithNames = await Promise.all(runs.map(async (run: any) => {
                    if (run.from_staff_id) {
                        const staffDoc = await getDoc(doc(db, 'staff', run.from_staff_id));
                        return { ...run, from_staff_name: staffDoc.exists() ? staffDoc.data().name : 'Unknown' };
                    }
                    return run;
                }));
                return runsWithNames;
            };

            const activeWithName = await fetchInitiatorNames(active);
            const completedWithName = await fetchInitiatorNames(completed);

            setActiveRuns(activeWithName);
            setCompletedRuns(completedWithName);
        } catch (error) {
            console.error("Error fetching runs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch sales runs.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Field Sales Runs</h1>

            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">Active Runs ({activeRuns.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed Runs ({completedRuns.length})</TabsTrigger>
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
                                <EmptyState title="No Active Sales Runs" description="Acknowledged sales runs will appear here." />
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
                                <EmptyState title="No Completed Runs" description="Your completed sales runs will appear here." />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

    