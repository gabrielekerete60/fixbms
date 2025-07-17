import Link from 'next/link';
import {
  Home,
  ShoppingBag,
  Package,
  Users,
  LineChart,
  Settings,
  CircleUser,
  Pizza,
  Package2,
  Inbox,
  ChevronRight,
  Users2,
  Car,
  Wallet,
  GanttChartSquare,
  HelpingHand,
  BookOpen,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/pos"
                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
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
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
