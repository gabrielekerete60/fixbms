
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Loader2, Trash2, CheckCircle, XCircle, Search, Eye, Edit, Rocket, CookingPot, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, onSnapshot, query, orderBy, where, doc, addDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startProductionBatch, approveIngredientRequest, declineProductionBatch, completeProductionBatch, ProductionBatch, ProductionLog, getRecipes, getProducts, getIngredients, getStaffByRole, getProductionBatch } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfDay, endOfDay } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type User = {
    name: string;
    role: string;
    staff_id: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
};

type Ingredient = {
    id: string;
    name: string;
    unit: string;
    stock: number;
    costPerUnit: number;
}

type RecipeIngredient = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
};

type BatchItem = {
    productId: string;
    productName: string;
    quantity: number | string;
}

function PaginationControls({
    visibleRows,
    setVisibleRows,
    totalRows
}: {
    visibleRows: number | 'all',
    setVisibleRows: (val: number | 'all') => void,
    totalRows: number
}) {
    const [inputValue, setInputValue] = useState<string>('');

    const handleApply = () => {
        const num = parseInt(inputValue, 10);
        if (!isNaN(num) && num > 0) {
            setVisibleRows(num);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <span>Show:</span>
            <Button variant={visibleRows === 10 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(10)}>10</Button>
            <Button variant={visibleRows === 20 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(20)}>20</Button>
            <Button variant={visibleRows === 50 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(50)}>50</Button>
            <Button variant={visibleRows === 'all' ? "default" : "outline"} size="sm" onClick={() => setVisibleRows('all')}>All ({totalRows})</Button>
             <div className="flex items-center gap-1">
                <Input 
                    type="number" 
                    className="h-8 w-16" 
                    placeholder="Custom"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <Button size="sm" onClick={handleApply}>Apply</Button>
            </div>
        </div>
    )
}

function DateRangeFilter({ date, setDate, align = 'end' }: { date: DateRange | undefined, setDate: (date: DateRange | undefined) => void, align?: "start" | "center" | "end" }) {
    const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setTempDate(date);
    }, [date]);

    const handleApply = () => {
        setDate(tempDate);
        setIsOpen(false);
    }

    return (
         <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? ( date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Filter by date range</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar initialFocus mode="range" defaultMonth={tempDate?.from} selected={tempDate} onSelect={setTempDate} numberOfMonths={2}/>
                <div className="p-2 border-t flex justify-end">
                    <Button onClick={handleApply}>Apply</Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}


function CompleteBatchDialog({ batch, user, onBatchCompleted, products }: { batch: ProductionBatch, user: User, onBatchCompleted: () => void, products: Product[] }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [storekeepers, setStorekeepers] = useState<any[]>([]);
    const [producedItems, setProducedItems] = useState<BatchItem[]>([{ productId: '', productName: '', quantity: '' }]);
    const [wastedItems, setWastedItems] = useState<BatchItem[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            const fetchStorekeepers = async () => {
                const staff = await getStaffByRole('Storekeeper');
                setStorekeepers(staff);
            };
            fetchStorekeepers();
            setProducedItems([{ productId: '', productName: '', quantity: '' }]);
            setWastedItems([]);
        }
    }, [isOpen]);

    const handleItemChange = (index: number, field: keyof BatchItem, value: string, type: 'produced' | 'wasted') => {
        const setItems = type === 'produced' ? setProducedItems : setWastedItems;
        const currentList = type === 'produced' ? producedItems : wastedItems;
        setItems(prevItems => {
            const newItems = [...prevItems];
            const currentItem = { ...newItems[index] };

            if (field === 'productId') {
                const product = products.find(p => p.id === value);
                currentItem.productId = value;
                currentItem.productName = product?.name || '';
            } else {
                currentItem.quantity = value;
            }
            newItems[index] = currentItem;
            return newItems;
        });
    }
    
    const handleAddItem = (type: 'produced' | 'wasted') => {
        const setItems = type === 'produced' ? setProducedItems : setWastedItems;
        setItems(prev => [...prev, { productId: '', productName: '', quantity: '' }]);
    }

    const handleRemoveItem = (index: number, type: 'produced' | 'wasted') => {
        const setItems = type === 'produced' ? setProducedItems : setWastedItems;
        setItems(prev => prev.filter((_, i) => i !== index));
    }


    const handleComplete = async () => {
        if (!storekeepers.length) {
            toast({ variant: 'destructive', title: 'Error', description: 'No Storekeeper found to transfer stock to. Please add a staff member with the "Storekeeper" role.' });
            return;
        }

        const finalProducedItems = producedItems.filter(p => p.productId && p.quantity && Number(p.quantity) > 0).map(p => ({ ...p, quantity: Number(p.quantity) }));
        const finalWastedItems = wastedItems.filter(p => p.productId && p.quantity && Number(p.quantity) > 0).map(p => ({ ...p, quantity: Number(p.quantity) }));

        if(finalProducedItems.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please add at least one produced item.'});
            return;
        }

        setIsLoading(true);
        if(!user) return;
        
        const result = await completeProductionBatch({
            batchId: batch.id,
            producedItems: finalProducedItems,
            wastedItems: finalWastedItems,
            storekeeperId: storekeepers[0].id // Assuming first storekeeper
        }, user);

        if (result.success) {
            toast({ title: 'Success', description: 'Production batch completed and sent for acknowledgement.' });
            onBatchCompleted();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }
    
    const getAvailableProducts = (type: 'produced' | 'wasted', index: number) => {
        const currentList = type === 'produced' ? producedItems : wastedItems;
        const selectedIds = new Set(currentList.filter((_, i) => i !== index).map(item => item.productId));
        return products.filter(p => !selectedIds.has(p.id) && p.category === 'Breads');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm">Complete Batch</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Complete Production Batch</DialogTitle>
                    <DialogDescription>
                        Enter the final counts for batch <strong>{batch.id.substring(0,6)}...</strong>.
                    </DialogDescription>
                     <DialogClose />
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {/* Items Produced Section */}
                    <div className="space-y-2">
                        <Label>Items Produced</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {producedItems.map((item, index) => (
                                <div key={`prod-${index}`} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                                    <Select value={item.productId} onValueChange={(val) => handleItemChange(index, 'productId', val, 'produced')}>
                                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                                        <SelectContent>
                                            {getAvailableProducts('produced', index).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value, 'produced')} />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index, 'produced')}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                         <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAddItem('produced')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </div>
                    <Separator />
                    {/* Wasted Products Section */}
                     <div className="space-y-2">
                        <Label>Wasted Products (Optional)</Label>
                         <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {wastedItems.map((item, index) => (
                                <div key={`waste-${index}`} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                                     <Select value={item.productId} onValueChange={(val) => handleItemChange(index, 'productId', val, 'wasted')}>
                                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                                        <SelectContent>
                                            {getAvailableProducts('wasted', index).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value, 'wasted')} />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index, 'wasted')}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAddItem('wasted')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Wasted Product
                        </Button>
                    </div>

                    <p className="text-sm text-muted-foreground">Completed items will be sent to the main store for acknowledgement. Wasted items will be logged.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleComplete} disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Complete Batch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ProductionLogDetailsDialog({ log, isOpen, onOpenChange, user }: { log: ProductionLog | null, isOpen: boolean, onOpenChange: (open: boolean) => void, user: User | null }) {
    const [batchDetails, setBatchDetails] = useState<ProductionBatch | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setBatchDetails(null);
            if (isOpen && log && log.action.includes('Batch') && log.details) {
                const batchIdMatch = log.details.match(/\b([a-zA-Z0-9]{20})\b/);
                const batchId = batchIdMatch ? batchIdMatch[0] : log.details.split(' ').pop();
                
                if (batchId) {
                    try {
                        const batch = await getProductionBatch(batchId);
                        setBatchDetails(batch);
                    } catch (error) {
                        console.error(`Could not fetch details for batch ${batchId}`, error)
                    }
                }
            }
        };
        fetchDetails();
    }, [isOpen, log]);
    
    if (!log || !isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Details</DialogTitle>
          <DialogDescription>
            Detailed information for log entry on {log.timestamp ? format(new Date(log.timestamp), 'PPp') : 'N/A'}.
          </DialogDescription>
           <DialogClose />
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-2"><strong>Action:</strong> <Badge>{log.action}</Badge></div>
            <p><strong>Staff Member:</strong> {log.staffName}</p>
            <p><strong>Details:</strong> {log.details}</p>
            {batchDetails && user.role !== 'Baker' && (
                 <>
                    <Separator className="my-4"/>
                    <h4 className="font-semibold text-base">Production Batch Details</h4>
                    <p><strong>Product:</strong> {batchDetails.productName} (x{batchDetails.quantityToProduce})</p>
                    <p><strong>Requested by:</strong> {batchDetails.requestedByName}</p>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead className="text-right">Available Before Prod</TableHead>
                            <TableHead className="text-right">Used</TableHead>
                            <TableHead className="text-right">Available After Prod</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {batchDetails.ingredients.map(ing => (
                                <TableRow key={ing.ingredientId}>
                                    <TableCell>{ing.ingredientName}</TableCell>
                                    <TableCell className="text-right">{((ing.openingStock || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {ing.unit}</TableCell>
                                    <TableCell className="text-right text-red-500">- {ing.quantity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {ing.unit}</TableCell>
                                    <TableCell className="text-right text-green-600 font-medium">{((ing.closingStock || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {ing.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartProductionDialog({
    onConfirm,
    recipe,
    user
}: {
    onConfirm: () => void;
    recipe: Recipe | null;
    user: User | null;
}) {
    if (!recipe || !user) return null;

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Start Production: {recipe.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will send a request for the standard set of ingredients to the storekeeper. Are you sure you want to proceed?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>Request Ingredients</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    )
}

function ApproveBatchDialog({ batch, user, allIngredients, onApproval }: { batch: ProductionBatch, user: User, allIngredients: Ingredient[], onApproval: () => void }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    const ingredientsWithStock = useMemo(() => {
        return batch.ingredients.map(reqIng => {
            const stockIng = allIngredients.find(sIng => sIng.id === reqIng.ingredientId);
            const stockAvailable = stockIng?.stock || 0;
            const hasEnough = stockAvailable >= reqIng.quantity;
            return { ...reqIng, stockAvailable, hasEnough };
        });
    }, [batch.ingredients, allIngredients]);

    const canApprove = ingredientsWithStock.every(ing => ing.hasEnough);
    
    const handleApprove = async () => {
        setIsLoading(true);
        const result = await approveIngredientRequest(batch.id, batch.ingredients, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch approved and moved to production.' });
            onApproval();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    const handleDecline = async () => {
        setIsLoading(true);
        const result = await declineProductionBatch(batch.id, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch has been declined.' });
            onApproval();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm">Review</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve Production Batch?</DialogTitle>
                    <DialogDescription>
                        Batch ID: {batch.id.substring(0,6)}...<br/>
                        Request for <strong>{batch.recipeName}</strong>. This will deduct ingredients from inventory.
                    </DialogDescription>
                    <DialogClose />
                </DialogHeader>
                <div className="max-h-60 overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead>Required</TableHead><TableHead>In Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {ingredientsWithStock.map(ing => (
                                <TableRow key={ing.ingredientId}>
                                    <TableCell>{ing.ingredientName}</TableCell>
                                    <TableCell>{ing.quantity} {ing.unit}</TableCell>
                                    <TableCell>{ing.stockAvailable.toFixed(2)} {ing.unit}</TableCell>
                                    <TableCell>
                                        {ing.hasEnough ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                     <Button variant="destructive" onClick={handleDecline} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
                        Decline
                    </Button>
                     <Button onClick={handleApprove} disabled={isLoading || !canApprove}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Approve
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RecipesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [generalRecipe, setGeneralRecipe] = useState<Recipe | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    
    // Real-time states
    const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
    const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
    const [viewingLog, setViewingLog] = useState<ProductionLog | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [logActionFilter, setLogActionFilter] = useState('all');
    const [logStaffFilter, setLogStaffFilter] = useState('all');
    const [logDate, setLogDate] = useState<DateRange | undefined>();
    const [visibleLogRows, setVisibleLogRows] = useState<number | 'all'>(10);

    const fetchStaticData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [recipeData, productData, ingredientData] = await Promise.all([
                getRecipes(),
                getProducts(),
                getIngredients(),
            ]);

            setGeneralRecipe(recipeData.find((r: Recipe) => r.name === "General Bread Production") || null);
            setProducts(productData);
            setIngredients(ingredientData);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch static data." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchStaticData();
    }, [fetchStaticData]);
    
    // Real-time listeners
    useEffect(() => {
        const qBatches = query(collection(db, 'production_batches'), where('status', 'in', ['pending_approval', 'in_production']));
        const unsubBatches = onSnapshot(qBatches, (snapshot) => {
            setProductionBatches(snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt.toDate().toISOString(),
                    approvedAt: data.approvedAt ? (data.approvedAt)?.toDate().toISOString() : null
                } as ProductionBatch
            }));
        });

        const qLogs = query(collection(db, 'production_logs'), orderBy('timestamp', 'desc'));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
             const logs = snapshot.docs.map(doc => {
                 const data = doc.data();
                 const timestamp = (data.timestamp as any)?.toDate ? (data.timestamp as any).toDate().toISOString() : data.timestamp;
                 return {
                    id: doc.id,
                    ...data,
                    timestamp,
                } as ProductionLog
             });
            setProductionLogs(logs);
        });

        return () => {
            unsubBatches();
            unsubLogs();
        }
    }, []);
    
    const handleStartProduction = async () => {
        if (!generalRecipe || !user) {
            toast({ variant: 'destructive', title: 'Invalid input', description: 'Recipe or user not found.' });
            return;
        }
        
        setIsSubmitting(true);

        const batchData = {
            recipeId: generalRecipe.id,
            recipeName: generalRecipe.name,
            productId: 'multi-product',
            productName: 'General Production',
            requestedById: user.staff_id,
            requestedByName: user.name,
            quantityToProduce: 1, // Represents one batch
            ingredients: generalRecipe.ingredients,
        };
        
        const result = await startProductionBatch(batchData, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Production batch requested for approval.'});
            setIsProductionDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error});
        }
        setIsSubmitting(false);
    }

    const logStaffMembers = useMemo(() => ['all', ...new Set(productionLogs.map(log => log.staffName))], [productionLogs]);
    const logActionTypes = useMemo(() => ['all', ...new Set(productionLogs.map(log => log.action))], [productionLogs]);

    const filteredLogs = useMemo(() => {
        return productionLogs.filter(log => {
            const staffMatch = logStaffFilter === 'all' || log.staffName === logStaffFilter;
            const actionMatch = logActionFilter === 'all' || log.action === logActionFilter;
            
            let dateMatch = true;
            if (logDate?.from) {
                const from = startOfDay(logDate.from);
                const to = logDate.to ? endOfDay(logDate.to) : endOfDay(logDate.from);
                const logTimestamp = new Date(log.timestamp);
                dateMatch = logTimestamp >= from && logTimestamp <= to;
            }
            return staffMatch && actionMatch && dateMatch;
        });
    }, [productionLogs, logStaffFilter, logActionFilter, logDate]);

    const paginatedLogs = useMemo(() => {
        return visibleLogRows === 'all' ? filteredLogs : filteredLogs.slice(0, visibleLogRows);
    }, [filteredLogs, visibleLogRows]);
    
    if (!user) {
         return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    const canApproveBatches = user.role === 'Manager' || user.role === 'Developer' || user.role === 'Storekeeper';
    const canCompleteBatches = user.role === 'Baker' || user.role === 'Chief Baker';
    const isBaker = user.role === 'Baker' || user.role === 'Chief Baker';

    const getStatusVariant = (status: string) => {
        switch(status) {
            case 'pending_approval': return 'destructive';
            case 'in_production': return 'default';
            default: return 'secondary';
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-headline">Production</h1>
            </div>

            <AlertDialog open={isProductionDialogOpen} onOpenChange={setIsProductionDialogOpen}>
                <AlertDialogTrigger asChild>
                    <div />
                </AlertDialogTrigger>
                <StartProductionDialog
                    onConfirm={handleStartProduction}
                    recipe={generalRecipe}
                    user={user}
                />
            </AlertDialog>
            
             <ProductionLogDetailsDialog 
                log={viewingLog}
                isOpen={!!viewingLog}
                onOpenChange={() => setViewingLog(null)}
                user={user}
            />
            
            <Tabs defaultValue="production">
                <TabsList>
                    <TabsTrigger value="production" className="relative">
                        Production Batches
                        {productionBatches.length > 0 && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                                {productionBatches.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="logs">Production Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="production">
                     <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>Active Production Batches</CardTitle>
                                <CardDescription>Batches that are pending approval or are currently being produced.</CardDescription>
                            </div>
                             <Button onClick={() => setIsProductionDialogOpen(true)}>
                                <CookingPot className="mr-2 h-4 w-4" /> Start General Production Batch
                            </Button>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Time Started</TableHead><TableHead>Recipe</TableHead><TableHead>Requested By</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {productionBatches.length > 0 ? productionBatches.map(batch => (
                                        <TableRow key={batch.id} onClick={() => { if(!isBaker) setViewingLog({ action: 'Batch Details', details: `Details for batch ${batch.id}`, staffId: batch.requestedById, staffName: batch.requestedByName, timestamp: batch.createdAt, id: batch.id })}} className={cn(!isBaker && "cursor-pointer")}>
                                            <TableCell>{batch.approvedAt ? format(new Date(batch.approvedAt), 'Pp') : format(new Date(batch.createdAt), 'Pp')}</TableCell>
                                            <TableCell>{batch.recipeName}</TableCell>
                                            <TableCell>{batch.requestedByName}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(batch.status)}>{batch.status.replace('_', ' ')}</Badge></TableCell>
                                            <TableCell>
                                                {batch.status === 'pending_approval' && canApproveBatches && (
                                                    <ApproveBatchDialog batch={batch} user={user} allIngredients={ingredients} onApproval={fetchStaticData} />
                                                )}
                                                {batch.status === 'in_production' && canCompleteBatches && (
                                                    <CompleteBatchDialog batch={batch} user={user} onBatchCompleted={fetchStaticData} products={products} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={6} className="text-center h-24">No active batches.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="logs">
                     <Card>
                        <CardHeader>
                            <CardTitle>Production Logs</CardTitle>
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
                                <CardDescription>A complete audit trail of all recipe and production activities.</CardDescription>
                                <div className="flex flex-wrap items-center gap-2">
                                     {!isBaker && (
                                         <Select value={logStaffFilter} onValueChange={setLogStaffFilter}>
                                            <SelectTrigger className="w-full sm:w-[180px]">
                                                <SelectValue placeholder="Filter by staff" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {logStaffMembers.map(staff => (
                                                    <SelectItem key={staff} value={staff} className="capitalize">{staff}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                     )}
                                    <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="Filter by action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {logActionTypes.map(action => (
                                                <SelectItem key={action} value={action}>{action}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <DateRangeFilter date={logDate} setDate={setLogDate} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Staff</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>View</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {paginatedLogs.length > 0 ? paginatedLogs.map(log => (
                                        <TableRow key={log.id} className="cursor-pointer" onClick={() => setViewingLog(log)}>
                                            <TableCell>{log.timestamp ? format(new Date(log.timestamp), 'Pp') : 'N/A'}</TableCell>
                                            <TableCell>{log.staffName}</TableCell>
                                            <TableCell><Badge>{log.action}</Badge></TableCell>
                                            <TableCell className="max-w-[300px] truncate">{log.details}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewingLog(log); }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No production logs found for this filter.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <PaginationControls visibleRows={visibleLogRows} setVisibleRows={setVisibleLogRows} totalRows={filteredLogs.length} />
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
