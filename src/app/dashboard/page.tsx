
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
import { checkForMissingIndexes } from '../actions';
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
import { startOfDay, startOfWeek, endOfWeek, startOfMonth, startOfYear, eachDayOfInterval, format } from 'date-fns';

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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const managementRoles = ['Manager', 'Supervisor', 'Accountant', 'Developer'];

  return (
    <div className="flex flex-col gap-4">
      {managementRoles.includes(user.role) ? (
        <ManagementDashboard />
      ) : (
        <StaffDashboard user={user} />
      )}
    </div>
  );
}
