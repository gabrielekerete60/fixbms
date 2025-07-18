
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
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
import { getDashboardStats, getStaffDashboardStats } from '../actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type User = {
  name: string;
  role: string;
  staff_id: string;
};

function ManagementDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getDashboardStats();
      setStats(data);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Monthly)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers (Monthly)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.customers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales (Monthly)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.sales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
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
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getStaffDashboardStats(user.staff_id);
      setStats(data);
      setIsLoading(false);
    }
    fetchData();
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
              <div className="text-2xl font-bold">{stats.personalStockCount}</div>
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
              <div className="text-2xl font-bold">{stats.pendingTransfersCount}</div>
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
              <div className="text-2xl font-bold">{stats.monthlyWasteReports}</div>
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
