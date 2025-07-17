import {
  Activity,
  ArrowUpRight,
  CreditCard,
  DollarSign,
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

export default function Dashboard() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue (Monthly)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦3,675.00</div>
            <p className="text-xs text-muted-foreground">
              +100.0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Customers (Monthly)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0</div>
            <p className="text-xs text-muted-foreground">
              No change from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales (Monthly)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+4</div>
            <p className="text-xs text-muted-foreground">
              +100.0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Currently pending or processing
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>This Week's Revenue</CardTitle>
              <CardDescription>
                Your sales performance for the current week.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Allotment Activity</CardTitle>
            <CardDescription>
              A log of ingredients recently taken by bakers from their weekly allotment.
            </CardDescription>
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
         <Card>
          <CardHeader>
            <CardTitle>Your Weekly Rating</CardTitle>
            <CardDescription>
              Your average rating from colleagues this week.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
             <p className="text-sm text-muted-foreground">No ratings received this week.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
