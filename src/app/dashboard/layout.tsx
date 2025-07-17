
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Package,
  Users,
  LineChart,
  Settings,
  CircleUser,
  Pizza,
  Inbox,
  ChevronRight,
  Users2,
  Car,
  Wallet,
  GanttChartSquare,
  HelpingHand,
  BookOpen,
  Clock,
  PanelLeft,
  Cookie,
  ClipboardList,
  Carrot,
  Archive,
  ListChecks,
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

type User = {
  name: string;
  role: string;
};

function SidebarNav({ navLinks, pathname }: { navLinks: any[], pathname: string }) {
  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navLinks.map((link) => 
        link.sublinks ? (
           <Collapsible key={link.label} className="grid gap-1" defaultOpen={link.sublinks.some(sub => pathname.startsWith(sub.href))}>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg:last-child]:rotate-90">
              <div className="flex items-center gap-3">
                <link.icon className="h-4 w-4" />
                {link.label}
              </div>
              <ChevronRight className="h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-7 flex flex-col gap-1 border-l pl-3">
              {link.sublinks.map(sublink => (
                 <Link 
                    key={sublink.label} 
                    href={sublink.href} 
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === sublink.href && "bg-muted text-primary"
                        )}>
                    {sublink.label}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Link
            key={link.label}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              pathname === link.href && "bg-muted text-primary"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        )
      )}
    </nav>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [time, setTime] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for user session on mount
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no user, redirect to login
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Clear user session from localStorage
    localStorage.removeItem('loggedInUser');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push("/");
  };


  const navLinks = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/pos", icon: ShoppingBag, label: "POS" },
    { href: "/dashboard/promotions", icon: LineChart, label: "Promotions" },
    {
      icon: Inbox, label: "Orders", sublinks: [
        { href: "/dashboard/orders/regular", label: "Regular Orders" },
        { href: "#", label: "Custom Orders" },
      ]
    },
    {
      icon: Package, label: "Inventory", sublinks: [
        { href: "/dashboard/inventory/products", label: "Products", icon: Cookie },
        { href: "/dashboard/inventory/recipes", label: "Recipes & Production", icon: ClipboardList },
        { href: "/dashboard/inventory/ingredients", label: "Ingredients", icon: Carrot },
        { href: "/dashboard/inventory/suppliers", label: "Suppliers" },
        { href: "/dashboard/inventory/stock-control", label: "Stock Control", icon: ListChecks },
        { href: "/dashboard/inventory/other-supplies", label: "Other Supplies", icon: Archive },
      ]
    },
    {
      icon: Users, label: "Customers", sublinks: [
        { href: "/dashboard/customers/profiles", label: "Profiles" },
        { href: "#", label: "Feedback" },
        { href: "#", label: "Loyalty Programs" },
      ]
    },
     {
      icon: Users2, label: "Staff", sublinks: [
        { href: "#", label: "Staff Management" },
        { href: "#", label: "Attendance" },
        { href: "#", label: "Payroll" },
      ]
    },
    { href: "#", icon: Car, label: "Deliveries" },
    { href: "#", icon: Wallet, label: "Accounting" },
    { href: "#", icon: GanttChartSquare, label: "AI Analytics" },
    { href: "#", icon: HelpingHand, label: "Communication" },
    { href: "#", icon: BookOpen, label: "Documentation" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  if (!user) {
    // Render a loading state or null while redirecting
    return null;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Pizza className="h-6 w-6 text-primary" />
              <span className="font-headline">BMS</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <SidebarNav navLinks={navLinks} pathname={pathname} />
          </div>
          <div className="mt-auto p-4 border-t">
            <div className='flex items-center justify-between text-sm text-muted-foreground mb-2'>
                <span>{time}</span>
                <Button variant="outline" size="sm">
                    <Clock className="mr-2 h-4 w-4" />
                    Clock In
                </Button>
            </div>
            <Card>
              <CardContent className="p-2 flex items-center gap-2">
                 <Avatar>
                  <AvatarImage src="https://placehold.co/40x40.png" alt={user.name} data-ai-hint="profile person" />
                  <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                    <p className='font-semibold text-sm'>{user.name}</p>
                    <p className='text-xs text-muted-foreground'>Role: {user.role}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col max-h-screen">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 shrink-0">
          <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                 <div className="flex h-14 shrink-0 items-center border-b px-4 lg:h-[60px]">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                      <Pizza className="h-6 w-6 text-primary" />
                      <span className="font-headline">BMS</span>
                    </Link>
                  </div>
                <div className="overflow-auto flex-1">
                    <SidebarNav navLinks={navLinks} pathname={pathname} />
                </div>
              </SheetContent>
            </Sheet>
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
              <Link href="/dashboard/settings" passHref>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </Link>
              <Link href="/dashboard/support" passHref>
                <DropdownMenuItem>Support</DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
