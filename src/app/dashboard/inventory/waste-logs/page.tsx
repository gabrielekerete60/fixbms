
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getWasteLogs, WasteLog } from "@/app/actions";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

type Product = {
    id: string;
    name: string;
    category: string;
}

export default function WasteLogsPage() {
    const { toast } = useToast();
    const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [categoryFilter, setCategoryFilter] = useState("all");
    const [reasonFilter, setReasonFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchPageData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [logsData, productsSnapshot] = await Promise.all([
                getWasteLogs(),
                getDocs(collection(db, "products"))
            ]);
            setWasteLogs(logsData);
            setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load waste log data." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);
    
    const productCategories = useMemo(() => ["all", ...new Set(products.map(p => p.category))], [products]);
    const wasteReasons = useMemo(() => ["all", "Spoiled", "Damaged", "Burnt", "Error", "Other"], []);

    const filteredLogs = useMemo(() => {
        return wasteLogs.filter(log => {
            const categoryMatch = categoryFilter === 'all' || log.productCategory === categoryFilter;
            const reasonMatch = reasonFilter === 'all' || log.reason === reasonFilter;
            const searchMatch = !searchTerm || log.productName.toLowerCase().includes(searchTerm.toLowerCase());
            return categoryMatch && reasonMatch && searchMatch;
        });
    }, [wasteLogs, categoryFilter, reasonFilter, searchTerm]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-headline">Waste Logs</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Waste Logs</CardTitle>
                    <CardDescription>Review all reported waste and damage across the business.</CardDescription>
                     <div className="flex items-center justify-between gap-4 pt-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Search by product name..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {productCategories.map(cat => (
                                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={reasonFilter} onValueChange={setReasonFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {wasteReasons.map(reason => (
                                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">No waste logs found for this filter.</TableCell></TableRow>
                            ) : (
                                filteredLogs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(new Date(log.date), 'PPP')}</TableCell>
                                        <TableCell>{log.staffName}</TableCell>
                                        <TableCell>{log.productName}</TableCell>
                                        <TableCell>{log.quantity}</TableCell>
                                        <TableCell>{log.reason}</TableCell>
                                        <TableCell>{log.notes || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

    