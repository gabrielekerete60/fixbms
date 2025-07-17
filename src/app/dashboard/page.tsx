import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Car,
  ChevronDown,
  ChevronRight,
  CircleUser,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  GanttChartSquare,
  HelpingHand,
  Home,
  Inbox,
  LineChart,
  Package,
  Package2,
  Pizza,
  Settings,
  ShoppingBag,
  Users,
  Users2,
  Wallet,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RevenueChart } from '@/components/revenue-chart';


export default function Dashboard() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Pizza className="h-6 w-6 text-primary" />
              <span className="font-headline">Bakery Management System</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <ShoppingBag className="h-4 w-4" />
                POS
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <LineChart className="h-4 w-4" />
                Promotions
              </Link>

              <Collapsible className="grid gap-1">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg]:rotate-90">
                  <div className="flex items-center gap-3">
                    <Inbox className="h-4 w-4" />
                    Orders
                  </div>
                  <ChevronRight className="h-4 w-4 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-7 flex flex-col gap-1 border-l pl-3">
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Regular Orders</Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Custom Orders</Link>
                </CollapsibleContent>
              </Collapsible>
              
              <Collapsible className="grid gap-1">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg]:rotate-90">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4" />
                      Inventory
                    </div>
                    <ChevronRight className="h-4 w-4 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-7 flex flex-col gap-1 border-l pl-3">
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Products</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Recipes</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Suppliers</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Ingredients</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Stock Control</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Other Supplies</Link>
                </CollapsibleContent>
              </Collapsible>
              
              <Collapsible className="grid gap-1">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg]:rotate-90">
                    <div className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        Customers
                    </div>
                    <ChevronRight className="h-4 w-4 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-7 flex flex-col gap-1 border-l pl-3">
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Profiles</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Feedback</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Loyalty Programs</Link>
                </CollapsibleContent>
              </Collapsible>

               <Collapsible className="grid gap-1">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg]:rotate-90">
                    <div className="flex items-center gap-3">
                        <Users2 className="h-4 w-4" />
                        Staff
                    </div>
                    <ChevronRight className="h-4 w-4 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-7 flex flex-col gap-1 border-l pl-3">
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Staff Management</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Attendance</Link>
                    <Link href="#" className="rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">Payroll</Link>
                </CollapsibleContent>
              </Collapsible>

              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Car className="h-4 w-4" />
                Deliveries
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Wallet className="h-4 w-4" />
                Accounting
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <GanttChartSquare className="h-4 w-4" />
                AI Analytics
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <HelpingHand className="h-4 w-4" />
                Communication
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                Documentation
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4 border-t">
            <div className='flex items-center justify-between text-sm text-muted-foreground mb-2'>
                <span>2:17:23 AM</span>
                <Button variant="outline" size="sm">
                    <Clock className="mr-2 h-4 w-4" />
                    Clock In
                </Button>
            </div>
            <Card>
              <CardContent className="p-2 flex items-center gap-2">
                 <Avatar>
                  <AvatarImage src="https://placehold.co/40x40.png" alt="@chrismanager" />
                  <AvatarFallback>CM</AvatarFallback>
                </Avatar>
                <div>
                    <p className='font-semibold text-sm'>Chris Manager</p>
                    <p className='text-xs text-muted-foreground'>chris.manager@example.com</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Package2 className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
          <div className="w-full flex-1">
            {/* Can add a search bar here if needed */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
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
        </main>
      </div>
    </div>
  );
}
