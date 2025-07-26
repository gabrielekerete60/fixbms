
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
import { checkForMissingIndexes, getDashboardStats, getStaffDashboardStats, getBakerDashboardStats } from '../actions';
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
import { startOfMonth } from 'date-fns';
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

type BakerDashboardStats = {
    activeBatches: number;
    producedThisWeek: number;
    weeklyProduction: { day: string, quantity: number }[];
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

  const fetchDashboardData = useCallback(async (filter: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setIsLoading(true);
    try {
        const [indexData, dashboardStats] = await Promise.all([
            checkForMissingIndexes(),
            getDashboardStats(filter)
        ]);
        setMissingIndexes(indexData.requiredIndexes);
        setStats(dashboardStats);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchDashboardData(revenueFilter);
  }, [revenueFilter, fetchDashboardData]);

  const handleFilterChange = (filter: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
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
            <CardTitle>Real Experience Score</CardTitle>
            <CardDescription>Measures the overall user experience.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="relative h-32 w-32">
                 <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        className="stroke-current text-muted"
                        strokeWidth="3"
                        fill="none"
                    />
                    <path
                        className="stroke-current text-yellow-500"
                        strokeWidth="3"
                        strokeDasharray="72, 100"
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                 </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-yellow-500">72</span>
                </div>
            </div>
             <div className="text-center">
              <p className="font-semibold text-lg text-yellow-500">Needs Improvement</p>
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Below 90</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">Less than 75% of visits had a great experience.</p>
            </div>
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
    
    const fetchStats = async () => {
        setIsLoading(true);
        const data = await getStaffDashboardStats(user.staff_id);
        setStats(data);
        setIsLoading(false);
    }
    fetchStats();

  }, [user.staff_id]);
  
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
    const fetchBakerData = async () => {
        setIsLoading(true);
        const data = await getBakerDashboardStats();
        setStats(data);
        setIsLoading(false);
    }
    fetchBakerData();
  }, [])
  
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
            <CardTitle className="text-sm font-medium">Total Produced This Week</CardTitle>
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
              <CardTitle>Production Chart (This Week)</CardTitle>
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
