
"use server";

import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, addDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/firebase";

type LoginResult = {
  success: boolean;
  error?: string;
  user?: {
    name: string;
    role: string;
    staff_id: string;
  }
};

export async function handleLogin(formData: FormData): Promise<LoginResult> {
  const staffId = formData.get("staff_id") as string;
  const password = formData.get("password") as string;

  if (!staffId || !password) {
    return { success: false, error: "Staff ID and password are required." };
  }
  
  try {
    const userDocRef = doc(db, "staff", staffId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return { success: false, error: "Invalid Staff ID or password." };
    }

    const userData = userDoc.data();
    
    if (userData.password !== password) {
      return { success: false, error: "Invalid Staff ID or password." };
    }
    
    if (!userData.is_active) {
        return { success: false, error: "This staff account is inactive." };
    }

    return { 
      success: true,
      user: {
        name: userData.name,
        role: userData.role,
        staff_id: userDoc.id,
      } 
    };
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: errorMessage };
  }
}

type AttendanceStatusResult = {
    attendanceId: string;
} | null;

export async function getAttendanceStatus(staffId: string): Promise<AttendanceStatusResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
        collection(db, "attendance"),
        where("staff_id", "==", staffId),
        where("clock_in_time", ">=", Timestamp.fromDate(today)),
        where("clock_in_time", "<", Timestamp.fromDate(tomorrow)),
        where("clock_out_time", "==", null),
        limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { attendanceId: doc.id };
    }
    return null;
}

type ClockInResult = {
    success: boolean;
    error?: string;
    attendanceId?: string;
}

export async function handleClockIn(staffId: string): Promise<ClockInResult> {
    try {
        const docRef = await addDoc(collection(db, "attendance"), {
            staff_id: staffId,
            clock_in_time: serverTimestamp(),
            clock_out_time: null,
            date: new Date().toISOString().split('T')[0], // Store just the date for easier querying
        });
        return { success: true, attendanceId: docRef.id };
    } catch (error) {
        console.error("Clock-in error:", error);
        return { success: false, error: "Failed to clock in." };
    }
}

type ClockOutResult = {
    success: boolean;
    error?: string;
}

export async function handleClockOut(attendanceId: string): Promise<ClockOutResult> {
    try {
        const docRef = doc(db, "attendance", attendanceId);
        await updateDoc(docRef, {
            clock_out_time: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Clock-out error:", error);
        return { success: false, error: "Failed to clock out." };
    }
}

type InitiateTransferResult = {
    success: boolean;
    error?: string;
}

export async function handleInitiateTransfer(data: any): Promise<InitiateTransferResult> {
    try {
        const userStr = localStorage.getItem('loggedInUser');
        if (!userStr) {
             return { success: false, error: "Could not identify initiator." };
        }
        const user = JSON.parse(userStr);

        await addDoc(collection(db, "transfers"), {
            ...data,
            from_staff_id: user.staff_id,
            date: serverTimestamp(),
            status: 'pending'
        });
        return { success: true };
    } catch (error) {
        console.error("Transfer initiation error:", error);
        return { success: false, error: "Failed to initiate transfer." };
    }
}


type DashboardStats = {
    revenue: number;
    customers: number;
    sales: number;
    activeOrders: number;
    weeklyRevenue: { day: string, revenue: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        // Revenue, Sales, Active Orders
        const ordersQuery = query(collection(db, "orders"), where("date", ">=", startOfCurrentMonth.toISOString()), where("date", "<=", endOfCurrentMonth.toISOString()));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        let revenue = 0;
        let activeOrders = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            revenue += order.total;
            if (order.status === 'Pending') {
                activeOrders++;
            }
        });

        // New Customers
        const customersQuery = query(collection(db, "customers"), where("joinedDate", ">=", startOfCurrentMonth), where("joinedDate", "<=", endOfCurrentMonth));
        const customersSnapshot = await getDocs(customersQuery);


        // Weekly Revenue for chart
        const weeklyRevenueData: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday as start of week
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyOrdersQuery = query(collection(db, "orders"), where("date", ">=", startOfWeek.toISOString()));
        const weeklyOrdersSnapshot = await getDocs(weeklyOrdersQuery);
        
        weeklyOrdersSnapshot.forEach(doc => {
            const order = doc.data();
            const orderDate = new Date(order.date);
            const dayOfWeek = orderDate.toLocaleString('en-US', { weekday: 'short' }); // Mon, Tue, etc.
            if (dayOfWeek in weeklyRevenueData) {
                weeklyRevenueData[dayOfWeek] += order.total;
            }
        });
        
        const weeklyRevenue = Object.entries(weeklyRevenueData).map(([day, revenue]) => ({ day, revenue }));
        
        return {
            revenue,
            customers: customersSnapshot.size,
            sales: ordersSnapshot.size,
            activeOrders,
            weeklyRevenue,
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Return zeroed-out data on error
        return {
            revenue: 0,
            customers: 0,
            sales: 0,
            activeOrders: 0,
            weeklyRevenue: [
                { day: 'Mon', revenue: 0 }, { day: 'Tue', revenue: 0 }, { day: 'Wed', revenue: 0 },
                { day: 'Thu', revenue: 0 }, { day: 'Fri', revenue: 0 }, { day: 'Sat', revenue: 0 }, { day: 'Sun', revenue: 0 },
            ]
        };
    }
}


export type SalesRun = {
    id: string;
    date: Timestamp;
    status: 'pending' | 'completed' | 'cancelled';
    items: { productId: string; productName: string; quantity: number }[];
    notes?: string;
    from_staff_name?: string; // Who initiated it
    from_staff_id?: string;
};

export async function getSalesRuns(staffId: string): Promise<{active: SalesRun[], completed: SalesRun[]}> {
    try {
        const q = query(
            collection(db, 'transfers'), 
            where('is_sales_run', '==', true),
            where('to_staff_id', '==', staffId),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const runs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRun));
        
        const active = runs.filter(run => run.status === 'pending');
        const completed = runs.filter(run => run.status !== 'pending');

        return { active, completed };
    } catch (error) {
        console.error("Error fetching sales runs:", error);
        return { active: [], completed: [] };
    }
}

    