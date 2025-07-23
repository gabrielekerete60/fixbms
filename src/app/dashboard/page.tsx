
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Box,
  CreditCard,
  DollarSign,
  FileText,
  Hourglass,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Trash2,
  Users,
  AlertTriangle,
  ClipboardList,
  Wrench,
  Package,
  Carrot,
  Archive,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RevenueChart } from '@/components/revenue-chart';
import { checkForMissingIndexes, getBakerDashboardStats, BakerDashboardStats } from '../actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { collection, query, where, onSnapshot, Timestamp, getDocs } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { startOfDay, startOfWeek, endOfWeek, startOfMonth, startOfYear, eachDayOfInterval, format, subDays } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';


type User = {
  name: string;
  role: string;
  staff_id: string;
};

type DashboardStats = {
    revenue: number;
    customers: number;
    sales: number;
    activeOrders: number;
    weeklyRevenue: { day: string, revenue: number }[];
};

type StaffDashboardStats = {
    personalStockCount: number;
    pendingTransfersCount: number;
    monthlyWasteReports: number;
};

type StorekeeperDashboardStats = {
    totalProductUnits: number;
    pendingBatchApprovals: number;
    totalInventoryValue: number;
    lowStockIngredients: number;
    productCategories: number;
    inventoryValueByCategory: { name: string, value: number }[];
};

function IndexWarning({ indexes }: { indexes: string[] }) {
    if (indexes.length === 0) return null;

    return (
        <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required: Database Configuration Needed</AlertTitle>
            <AlertDescription>
                <p className="mb-2">
                Your application requires one or more database indexes to function correctly. Without them, some pages or features may not load data.
                </p>
                <p>Please click the link(s) below to create the necessary indexes in your Firebase console:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    {indexes.map((url, index) => (
                        <li key={index}>
                             <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-destructive-foreground">
                                Create Required Index #{index + 1}
                            </a>
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    )
}

function ManagementDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [missingIndexes, setMissingIndexes] = useState<string[]>([]);
  const [revenueFilter, setRevenueFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const fetchIndexData = useCallback(async () => {
    const indexData = await checkForMissingIndexes();
    setMissingIndexes(indexData.requiredIndexes);
  }, []);

  useEffect(() => {
    fetchIndexData();

    const now = new Date();
    let startOfPeriod: Date;

    switch (revenueFilter) {
        case 'daily':
            startOfPeriod = startOfDay(now);
            break;
        case 'weekly':
            startOfPeriod = startOfWeek(now, { weekStartsOn: 1 });
            break;
        case 'monthly':
        default:
            startOfPeriod = startOfMonth(now);
            break;
        case 'yearly':
            startOfPeriod = startOfYear(now);
            break;
    }
    const startOfPeriodTimestamp = Timestamp.fromDate(startOfPeriod);

    // Real-time listener for orders
    const ordersQuery = query(collection(db, "orders"), where("date", ">=", startOfPeriodTimestamp));
    const unsubscribeOrders = onSnapshot(ordersQuery, (querySnapshot) => {
        let revenue = 0;
        let activeOrders = 0;
        let sales = querySnapshot.size;

        querySnapshot.forEach(doc => {
            const order = doc.data();
            revenue += order.total;
            if (order.status === 'Pending') {
                activeOrders++;
            }
        });
        
        // Real-time weekly revenue calculation
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weeklyRevenueData = daysInWeek.map(day => ({ day: format(day, 'E'), revenue: 0 }));
        
        querySnapshot.forEach(doc => {
            const order = doc.data();
            const orderDate = (order.date as Timestamp).toDate();
            if (orderDate >= weekStart && orderDate <= weekEnd) {
                const dayOfWeek = format(orderDate, 'E'); 
                const index = weeklyRevenueData.findIndex(d => d.day === dayOfWeek);
                if (index !== -1) {
                    weeklyRevenueData[index].revenue += order.total;
                }
            }
        });
        
        setStats(prev => ({ ...prev, revenue, activeOrders, sales, weeklyRevenue: weeklyRevenueData } as DashboardStats));
        if (isLoading) setIsLoading(false);
    });

    // One-time fetch for customers
    const fetchCustomers = async () => {
        const customersQuery = query(collection(db, "customers"), where("joinedDate", ">=", startOfPeriodTimestamp));
        const customersSnapshot = await getDocs(customersQuery);
        setStats(prev => ({ ...prev, customers: customersSnapshot.size } as DashboardStats));
    };
    
    fetchCustomers();

    return () => unsubscribeOrders();
  }, [revenueFilter, isLoading, fetchIndexData]);

  const handleFilterChange = (filter: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setIsLoading(true);
    setRevenueFilter(filter);
  };
  
  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <IndexWarning indexes={missingIndexes} />
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium capitalize">Revenue ({revenueFilter})</CardTitle>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4 text-muted-foreground"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleFilterChange('daily')}>Today</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleFilterChange('weekly')}>This Week</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleFilterChange('monthly')}>This Month</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleFilterChange('yearly')}>This Year</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.revenue?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers ({revenueFilter})</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.customers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales ({revenueFilter})</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.sales || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders || 0}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>This Week's Revenue</CardTitle>
              <CardDescription>Your sales performance for the current week.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={stats.weeklyRevenue} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Allotment Activity</CardTitle>
            <CardDescription>A log of ingredients recently taken by bakers from their weekly allotment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Baker</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No allotment activity yet.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StaffDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user.staff_id) return;
    
    const personalStockQuery = collection(db, 'staff', user.staff_id, 'personal_stock');
    const pendingTransfersQuery = query(collection(db, 'transfers'), where('to_staff_id', '==', user.staff_id), where('status', '==', 'pending'));
    const wasteLogsQuery = query(collection(db, 'waste_logs'), where('staffId', '==', user.staff_id), where('date', '>=', Timestamp.fromDate(startOfMonth(new Date()))));

    const unsubPersonalStock = onSnapshot(personalStockQuery, (snapshot) => {
        const personalStockCount = snapshot.docs.reduce((sum, doc) => sum + doc.data().stock, 0);
        setStats(prev => ({...prev, personalStockCount} as StaffDashboardStats));
        if (isLoading) setIsLoading(false);
    });

    const unsubPendingTransfers = onSnapshot(pendingTransfersQuery, (snapshot) => {
        setStats(prev => ({...prev, pendingTransfersCount: snapshot.size} as StaffDashboardStats));
        if (isLoading) setIsLoading(false);
    });

    const unsubWasteLogs = onSnapshot(wasteLogsQuery, (snapshot) => {
        setStats(prev => ({...prev, monthlyWasteReports: snapshot.size} as StaffDashboardStats));
        if (isLoading) setIsLoading(false);
    });

    return () => {
        unsubPersonalStock();
        unsubPendingTransfers();
        unsubWasteLogs();
    }
  }, [user.staff_id, isLoading]);
  
  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
      <p className="text-muted-foreground">Here is a summary of your activities.</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        <Link href="/dashboard/inventory/stock-control">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Stock</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.personalStockCount || 0}</div>
              <p className="text-xs text-muted-foreground">Total product units in your inventory.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/inventory/stock-control">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
              <Hourglass className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTransfersCount || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting your acknowledgment.</p>
            </CardContent>
          </Card>
        </Link>
         <Link href="/dashboard/inventory/stock-control">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waste Reports (Monthly)</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyWasteReports || 0}</div>
              <p className="text-xs text-muted-foreground">Items you've reported as waste this month.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get to your most important tasks quickly.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/inventory/stock-control" passHref>
                <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <PackageCheck className="h-6 w-6" />
                    <span>Acknowledge Stock</span>
                </Button>
            </Link>
             <Link href="/dashboard/inventory/stock-control" passHref>
                <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <Trash2 className="h-6 w-6" />
                    <span>Report Waste</span>
                </Button>
            </Link>
             <Link href="/dashboard/communication" passHref>
                <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Submit Report</span>
                </Button>
            </Link>
        </CardContent>
      </Card>
    </>
  );
}

const chartConfig = {
  quantity: {
    label: "Quantity",
    color: "hsl(var(--chart-1))",
  },
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  }
};

function BakerDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<BakerDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    let start, end;
    const now = new Date();
    if(dateRange === 'weekly') {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
        start = startOfMonth(now);
        end = now;
    }

    const qBatches = query(
        collection(db, 'production_batches'), 
        where('approvedAt', '>=', Timestamp.fromDate(start)),
        where('approvedAt', '<=', Timestamp.fromDate(end))
    );
    
    const unsubscribe = onSnapshot(qBatches, (snapshot) => {
        let producedThisPeriod = 0;
        
        const interval = eachDayOfInterval({start, end});
        const productionData = interval.map(day => ({
            day: format(day, dateRange === 'weekly' ? 'E' : 'dd'),
            quantity: 0
        }));

        snapshot.docs.forEach(doc => {
            const batch = doc.data();
            if(batch.status === 'completed') {
                const produced = batch.successfullyProduced || 0;
                producedThisPeriod += produced;

                const approvedDate = (batch.approvedAt as Timestamp).toDate();
                const dayKey = format(approvedDate, dateRange === 'weekly' ? 'E' : 'dd');
                const index = productionData.findIndex(d => d.day === dayKey);
                if (index !== -1) {
                    productionData[index].quantity += produced;
                }
            }
        });
        
        const activeBatchesQuery = query(collection(db, 'production_batches'), where('status', 'in', ['in_production', 'pending_approval']));
        getDocs(activeBatchesQuery).then(activeSnapshot => {
             setStats({
                activeBatches: activeSnapshot.size,
                producedThisWeek: producedThisPeriod,
                weeklyProduction: productionData,
            });
            setIsLoading(false);
        });
    });

    return () => unsubscribe();
  }, [dateRange])
  
  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
     <>
      <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
      <p className="text-muted-foreground">Here's your production summary.</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Production Batches</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBatches}</div>
            <p className="text-xs text-muted-foreground">Includes pending and in-production.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produced ({dateRange})</CardTitle>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4 text-muted-foreground"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setDateRange('weekly')}>This Week</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDateRange('monthly')}>This Month</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.producedThisWeek}</div>
            <p className="text-xs text-muted-foreground">Total items successfully produced.</p>
          </CardContent>
        </Card>
      </div>

       <Card className="mt-6">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Production Chart ({dateRange})</CardTitle>
              <CardDescription>Quantity of items you've baked this period.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={stats.weeklyProduction}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
    </>
  )
}

function StorekeeperDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<StorekeeperDashboardStats>({
    totalProductUnits: 0,
    pendingBatchApprovals: 0,
    totalInventoryValue: 0,
    lowStockIngredients: 0,
    productCategories: 0,
    inventoryValueByCategory: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const productsQuery = collection(db, 'products');
    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      const totalUnits = snapshot.docs.reduce((sum, doc) => sum + (doc.data().stock || 0), 0);
      const categories = new Set(snapshot.docs.map(doc => doc.data().category));
      setStats(prev => ({ ...prev, totalProductUnits: totalUnits, productCategories: categories.size }));
      if (isLoading) setIsLoading(false);
    });

    const ingredientsQuery = collection(db, 'ingredients');
    const unsubIngredients = onSnapshot(ingredientsQuery, (snapshot) => {
        let lowStockCount = 0;
        const valueByCategory: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const stock = data.stock || 0;
            const cost = data.costPerUnit || 0;

            if (stock > 0 && stock < 20) { // Assuming low stock is < 20
                lowStockCount++;
            }
            // Grouping by first word of name for simplicity
            const category = data.name.split(' ')[0] || 'Other';
            if(!valueByCategory[category]) valueByCategory[category] = 0;
            valueByCategory[category] += stock * cost;

        });

        const inventoryValueByCategory = Object.entries(valueByCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 5); // top 5

        setStats(prev => ({ ...prev, lowStockIngredients: lowStockCount, inventoryValueByCategory }));
    });

    const pendingBatchesQuery = query(collection(db, 'production_batches'), where('status', '==', 'pending_approval'));
    const unsubBatches = onSnapshot(pendingBatchesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingBatchApprovals: snapshot.size }));
      if (isLoading) setIsLoading(false);
    });

    return () => {
      unsubProducts();
      unsubIngredients();
      unsubBatches();
    };
  }, [isLoading]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
      <p className="text-muted-foreground">Here is your store summary.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Product Units</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProductUnits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Finished goods in stock.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Categories</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productCategories}</div>
            <p className="text-xs text-muted-foreground">Number of unique categories.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Ingredients</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockIngredients}</div>
            <p className="text-xs text-muted-foreground">Items with less than 20 units.</p>
          </CardContent>
        </Card>
        <Link href="/dashboard/inventory/stock-control">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Hourglass className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingBatchApprovals}</div>
                <p className="text-xs text-muted-foreground">Awaiting your approval.</p>
              </CardContent>
            </Card>
        </Link>
      </div>

       <Card className="mt-6">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Inventory Value by Category</CardTitle>
              <CardDescription>Top 5 most valuable ingredient categories.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={stats.inventoryValueByCategory} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                <XAxis dataKey="value" type="number" hide />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `₦${value.toLocaleString()}`} />}
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
    </>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const managementRoles = ['Manager', 'Supervisor', 'Accountant', 'Developer'];

  if (user.role === 'Baker') {
      return <BakerDashboard user={user} />;
  }
  
  if(user.role === 'Storekeeper') {
      return <StorekeeperDashboard user={user} />;
  }

  if (managementRoles.includes(user.role)) {
      return <ManagementDashboard />;
  }

  return <StaffDashboard user={user} />;
}
