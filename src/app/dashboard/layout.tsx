
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
  LogOut,
  LogIn,
  Loader2,
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
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getAttendanceStatus, handleClockIn, handleClockOut, handleLogin } from '../actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type User = {
  name: string;
  role: string;
  staff_id: string;
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
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [isClocking, setIsClocking] = useState(true);

  const handleLogout = useCallback((message?: string) => {
    localStorage.removeItem('loggedInUser');
    toast({
      variant: message ? "destructive" : "default",
      title: message ? "Logged Out" : "Logged Out",
      description: message || "You have been successfully logged out.",
    });
    router.push("/");
  }, [router, toast]);


  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      const checkAttendance = async () => {
        setIsClocking(true);
        const status = await getAttendanceStatus(parsedUser.staff_id);
        if (status) {
          setIsClockedIn(true);
          setAttendanceId(status.attendanceId);
        } else {
          setIsClockedIn(false);
          setAttendanceId(null);
        }
        setIsClocking(false);
      };
      checkAttendance();

    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Real-time user status check
  useEffect(() => {
      if (!user) return;

      const checkUserStatus = async () => {
          const userDocRef = doc(db, "staff", user.staff_id);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
              const userData = userDoc.data();
              if (!userData.is_active) {
                  handleLogout("This staff account is inactive.");
              }
          } else {
              // User doesn't exist anymore
              handleLogout("User account not found.");
          }
      };
      
      // Check every 15 seconds
      const interval = setInterval(checkUserStatus, 15000);
      
      // Also check when window regains focus
      window.addEventListener('focus', checkUserStatus);
      
      return () => {
          clearInterval(interval);
          window.removeEventListener('focus', checkUserStatus);
      };

  }, [user, handleLogout]);

  
  const handleClockInOut = async () => {
    if (!user) return;
    setIsClocking(true);
    if (isClockedIn) {
      if (attendanceId) {
        const result = await handleClockOut(attendanceId);
        if (result.success) {
          setIsClockedIn(false);
          setAttendanceId(null);
          toast({ title: "Clocked Out", description: "You have successfully clocked out." });
        } else {
          toast({ variant: 'destructive', title: "Error", description: result.error });
        }
      }
    } else {
      const result = await handleClockIn(user.staff_id);
      if (result.success && result.attendanceId) {
        setIsClockedIn(true);
        setAttendanceId(result.attendanceId);
        toast({ title: "Clocked In", description: "You have successfully clocked in." });
      } else {
        toast({ variant: 'destructive', title: "Error", description: result.error });
      }
    }
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('attendanceChanged'));
    setIsClocking(false);
  };

  const navLinks = useMemo(() => {
    const allLinks = [
      { href: "/dashboard", icon: Home, label: "Dashboard", roles: ['Manager', 'Supervisor', 'Accountant', 'Showroom Staff', 'Delivery Staff', 'Baker', 'Storekeeper'] },
      { href: "/dashboard/pos", icon: ShoppingBag, label: "POS", roles: ['Manager', 'Supervisor', 'Showroom Staff'] },
      { href: "/dashboard/promotions", icon: LineChart, label: "Promotions", roles: ['Manager', 'Supervisor'] },
      {
        icon: Inbox, label: "Orders", roles: ['Manager', 'Supervisor', 'Showroom Staff', 'Accountant'], sublinks: [
          { href: "/dashboard/orders/regular", label: "Regular Orders" },
          { href: "#", label: "Custom Orders" },
        ]
      },
      {
        icon: Package, label: "Inventory", roles: ['Manager', 'Supervisor', 'Baker', 'Storekeeper', 'Accountant', 'Delivery Staff', 'Showroom Staff'], sublinks: [
          { href: "/dashboard/inventory/products", label: "Products", icon: Cookie, roles: ['Manager', 'Supervisor', 'Baker', 'Storekeeper', 'Accountant'] },
          { href: "/dashboard/inventory/recipes", label: "Recipes & Production", icon: ClipboardList, roles: ['Manager', 'Supervisor', 'Baker', 'Storekeeper'] },
          { href: "/dashboard/inventory/ingredients", label: "Ingredients", icon: Carrot, roles: ['Manager', 'Supervisor', 'Baker', 'Storekeeper', 'Accountant'] },
          { href: "/dashboard/inventory/suppliers", label: "Suppliers", roles: ['Manager', 'Supervisor', 'Storekeeper', 'Accountant'] },
          { href: "/dashboard/inventory/stock-control", label: "Stock Control", icon: ListChecks, roles: ['Manager', 'Supervisor', 'Storekeeper', 'Delivery Staff', 'Showroom Staff', 'Baker'] },
          { href: "/dashboard/inventory/other-supplies", label: "Other Supplies", icon: Archive, roles: ['Manager', 'Supervisor', 'Storekeeper', 'Accountant'] },
        ]
      },
      {
        icon: Users, label: "Customers", roles: ['Manager', 'Supervisor'], sublinks: [
          { href: "/dashboard/customers/profiles", label: "Profiles" },
          { href: "#", label: "Feedback" },
          { href: "#", label: "Loyalty Programs" },
        ]
      },
       {
        icon: Users2, label: "Staff", roles: ['Manager', 'Supervisor'], sublinks: [
          { href: "/dashboard/staff/management", label: "Staff Management" },
          { href: "/dashboard/staff/attendance", label: "Attendance" },
          { href: "/dashboard/staff/payroll", label: "Payroll" },
        ]
      },
      { href: "/dashboard/deliveries", icon: Car, label: "Deliveries", roles: ['Manager', 'Supervisor', 'Delivery Staff'] },
      { href: "/dashboard/accounting", icon: Wallet, label: "Accounting", roles: ['Manager', 'Accountant'] },
      { href: "#", icon: GanttChartSquare, label: "AI Analytics", roles: ['Manager'] },
      { href: "/dashboard/communication", icon: HelpingHand, label: "Communication", roles: ['Manager', 'Supervisor', 'Accountant', 'Showroom Staff', 'Delivery Staff', 'Baker', 'Storekeeper'] },
      { href: "/dashboard/documentation", icon: BookOpen, label: "Documentation", roles: ['Manager', 'Supervisor', 'Accountant', 'Showroom Staff', 'Delivery Staff', 'Baker', 'Storekeeper'] },
      { href: "/dashboard/settings", icon: Settings, label: "Settings", roles: ['Manager'] },
    ];

    if (!user) return [];

    const filterLinks = (links: any[]) => {
      return links.reduce((acc: any[], link) => {
        if (!link.roles || link.roles.includes(user.role)) {
          if (link.sublinks) {
            const filteredSublinks = link.sublinks.filter((sublink: any) => !sublink.roles || sublink.roles.includes(user.role));
            if (filteredSublinks.length > 0) {
              acc.push({ ...link, sublinks: filteredSublinks });
            }
          } else {
            acc.push(link);
          }
        }
        return acc;
      }, []);
    };
    
    return filterLinks(allLinks);

  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Pizza className="h-6 w-6 text-primary" />
              <span className="font-headline">BMS</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <SidebarNav navLinks={navLinks} pathname={pathname} />
          </div>
          <div className="mt-auto p-4 border-t">
            <div className='flex items-center justify-between text-sm text-muted-foreground mb-2'>
                <span><Clock className="inline h-4 w-4 mr-1" />{time}</span>
                <Button variant={isClockedIn ? "destructive" : "outline"} size="sm" onClick={handleClockInOut} disabled={isClocking}>
                    {isClocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isClockedIn ? <LogOut className="mr-2 h-4 w-4"/> : <LogIn className="mr-2 h-4 w-4"/>)}
                    {isClocking ? 'Loading...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
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
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
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
              <DropdownMenuItem onSelect={() => handleLogout()}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background overflow-auto relative">
          <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          {children}
        </main>
      </div>
    </div>
  );
}
