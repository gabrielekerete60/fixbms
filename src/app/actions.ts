
"use server";

import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, addDoc, updateDoc, Timestamp, serverTimestamp, writeBatch, increment, deleteDoc, runTransaction, setDoc } from "firebase/firestore";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, endOfYear, eachDayOfInterval, format, subDays, endOfHour, startOfHour, startOfYear as dateFnsStartOfYear } from "date-fns";
import { db } from "@/lib/firebase";
import { randomUUID } from 'crypto';
import speakeasy from 'speakeasy';
import 'dotenv/config';

type LoginResult = {
  success: boolean;
  error?: string;
  mfaRequired?: boolean;
  user?: {
    name: string;
    role: string;
    staff_id: string;
    email: string;
    theme?: string;
  }
};

// NOTE: In a real production application, you would use the Firebase Admin SDK 
// in a secure backend environment (like Cloud Functions) to set custom claims.
// This function simulates that process for the prototype.
async function setAuthClaims(userId: string, claims: object) {
    console.log(`Simulating setting custom claims for ${userId}:`, claims);
    // In a real backend:
    // await admin.auth().setCustomUserClaims(userId, claims);
    return Promise.resolve();
}

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
    
    // This is the critical step: Set custom claims upon successful login.
    await setAuthClaims(staffId, { role: userData.role });
    
    if (userData.mfa_enabled) {
        return { success: true, mfaRequired: true, user: { staff_id: userDoc.id, name: userData.name, role: userData.role, email: userData.email, theme: userData.theme || 'default' } };
    }
    
    await updateDoc(userDocRef, {
        lastLogin: serverTimestamp(),
    });

    return { 
      success: true,
      user: {
        name: userData.name,
        role: userData.role,
        staff_id: userDoc.id,
        email: userData.email,
        theme: userData.theme || 'default'
      } 
    };
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: errorMessage };
  }
}

type MfaResult = {
  success: boolean;
  error?: string;
  user?: {
    name: string;
    role: string;
    staff_id: string;
    email: string;
    theme?: string;
  }
}

export async function verifyMfa(staffId: string, token: string): Promise<MfaResult> {
    if (!staffId || !token) {
        return { success: false, error: "Staff ID and token are required." };
    }
    
    try {
        const userDocRef = doc(db, "staff", staffId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { success: false, error: "User not found." };
        }
        
        const userData = userDoc.data();
        if (!userData.mfa_enabled || !userData.mfa_secret) {
            return { success: false, error: "MFA is not enabled for this user." };
        }

        const verified = speakeasy.totp.verify.call(speakeasy.totp, {
            secret: userData.mfa_secret,
            encoding: 'base32',
            token: token,
        });

        if (!verified) {
            return { success: false, error: "Invalid MFA token." };
        }
        
        // This is the critical step: Set custom claims upon successful MFA verification.
        await setAuthClaims(staffId, { role: userData.role });

        await updateDoc(userDocRef, {
            lastLogin: serverTimestamp(),
        });
        
        return {
            success: true,
            user: {
                name: userData.name,
                role: userData.role,
                staff_id: userDoc.id,
                email: userData.email,
                theme: userData.theme || 'default'
            }
        };

    } catch (error) {
        console.error("MFA verification error:", error);
        return { success: false, error: "An unexpected server error occurred during MFA verification." };
    }
}

export async function verifyMfaSetup(staffId: string, token: string, secret: string): Promise<{ success: boolean; error?: string }> {
    if (!staffId || !token || !secret) {
        return { success: false, error: "Staff ID, token, and secret are required." };
    }
    try {
        const verified = speakeasy.totp.verify.call(speakeasy.totp, {
            secret,
            encoding: 'base32',
            token,
        });

        if (!verified) {
            return { success: false, error: "Invalid MFA token. Please check your authenticator app and try again." };
        }

        const userDocRef = doc(db, "staff", staffId);
        await updateDoc(userDocRef, {
            mfa_enabled: true,
            mfa_secret: secret
        });

        return { success: true };

    } catch (error) {
        console.error("MFA setup verification error:", error);
        return { success: false, error: "An unexpected server error occurred during MFA setup." };
    }
}

export async function disableMfa(staffId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userDocRef = doc(db, "staff", staffId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists() || !userDoc.data().mfa_enabled || !userDoc.data().mfa_secret) {
            return { success: false, error: "MFA is not enabled for this user." };
        }

        const verified = speakeasy.totp.verify.call(speakeasy.totp, {
            secret: userDoc.data().mfa_secret,
            encoding: 'base32',
            token: token,
        });

        if (!verified) {
            return { success: false, error: "Invalid MFA token." };
        }

        await updateDoc(userDocRef, {
            mfa_enabled: false,
            mfa_secret: ""
        });
        return { success: true };
    } catch (error) {
        console.error("Error disabling MFA:", error);
        return { success: false, error: "Failed to disable MFA." };
    }
}

export async function handleChangePassword(staffId: string, currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userDocRef = doc(db, "staff", staffId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { success: false, error: "User not found." };
        }

        const userData = userDoc.data();
        if (userData.password !== currentPass) {
            return { success: false, error: "Incorrect current password." };
        }

        await updateDoc(userDocRef, {
            password: newPass
        });

        return { success: true };
    } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, error: "Failed to change password." };
    }
}

export async function handleUpdateTheme(staffId: string, theme: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userDocRef = doc(db, "staff", staffId);
        await updateDoc(userDocRef, { theme: theme });
        return { success: true };
    } catch (error) {
        console.error("Error updating theme:", error);
        return { success: false, error: "Failed to update theme." };
    }
}

export async function updateAppSettings(settings: { storeAddress?: string, staffIdLength?: number }): Promise<{ success: boolean; error?: string }> {
    try {
        const settingsRef = doc(db, 'settings', 'app_config');
        const currentSettingsDoc = await getDoc(settingsRef);
        const currentSettings = currentSettingsDoc.exists() ? currentSettingsDoc.data() : {};
        
        await setDoc(settingsRef, settings, { merge: true });
        
        // Handle Staff ID length change if it's different from the current one
        if (settings.staffIdLength && settings.staffIdLength !== currentSettings.staffIdLength) {
            const allStaffQuery = collection(db, 'staff');
            const staffSnapshot = await getDocs(allStaffQuery);

            const batch = writeBatch(db);
            
            for (const staffDoc of staffSnapshot.docs) {
                const oldId = staffDoc.id;
                const staffData = staffDoc.data();
                
                let newId = oldId;
                if (oldId.length > settings.staffIdLength) {
                    newId = oldId.substring(0, settings.staffIdLength);
                } else if (oldId.length < settings.staffIdLength) {
                    newId = oldId.padEnd(settings.staffIdLength, '0');
                }

                if (newId !== oldId) {
                    // Re-create the document with the new ID and delete the old one
                    const newStaffRef = doc(db, 'staff', newId);
                    batch.set(newStaffRef, staffData);
                    batch.delete(staffDoc.ref);
                }
            }
            await batch.commit();
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating app settings:", error);
        return { success: false, error: 'Failed to update application settings.' };
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
        const docSnap = querySnapshot.docs[0];
        return { attendanceId: docSnap.id };
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
            date: new Date().toISOString().split('T')[0], // Store just the date for easier querying
            clock_out_time: null,
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

export async function handleInitiateTransfer(data: any, user: { staff_id: string, name: string }): Promise<InitiateTransferResult> {
    try {
        await addDoc(collection(db, "transfers"), {
            ...data,
            from_staff_id: user.staff_id,
            from_staff_name: user.name,
            date: serverTimestamp(),
            status: 'pending'
        });
        return { success: true };
    } catch (error) {
        console.error("Transfer initiation error:", error);
        return { success: false, error: "Failed to initiate transfer." };
    }
}


export type DashboardStats = {
    revenue: number;
    customers: number;
    sales: number;
    activeOrders: number;
    weeklyRevenue: { day: string, revenue: number }[];
};

export async function getDashboardStats(filter: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'): Promise<DashboardStats> {
    try {
        const now = new Date();
        let startOfPeriod: Date;
        let endOfPeriod: Date = endOfDay(now);

        switch (filter) {
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
                startOfPeriod = dateFnsStartOfYear(now);
                endOfPeriod = endOfYear(now);
                break;
        }
        
        const startOfPeriodTimestamp = Timestamp.fromDate(startOfPeriod);
        const endOfPeriodTimestamp = Timestamp.fromDate(endOfPeriod);

        const ordersQuery = query(
            collection(db, "orders"), 
            where("date", ">=", startOfPeriodTimestamp),
            where("date", "<=", endOfPeriodTimestamp)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        
        let revenue = 0;
        let activeOrders = 0;
        ordersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            if (order.total && typeof order.total === 'number') {
                revenue += order.total;
            }
            if (order.status === 'Pending') {
                activeOrders++;
            }
        });

        const customersQuery = query(
            collection(db, "customers"), 
            where("joinedDate", ">=", startOfPeriodTimestamp),
            where("joinedDate", "<=", endOfPeriodTimestamp)
        );
        const customersSnapshot = await getDocs(customersQuery);

        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const weeklyRevenueData = daysInWeek.map(day => ({
            day: format(day, 'E'),
            revenue: 0,
        }));
        
        const weeklyOrdersQuery = query(
            collection(db, "orders"), 
            where("date", ">=", Timestamp.fromDate(weekStart)),
            where("date", "<=", Timestamp.fromDate(weekEnd))
        );
        const weeklyOrdersSnapshot = await getDocs(weeklyOrdersQuery);
        
        weeklyOrdersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            const orderTimestamp = order.date as Timestamp;
            const orderDate = orderTimestamp.toDate();
            const dayOfWeek = format(orderDate, 'E'); 
            const index = weeklyRevenueData.findIndex(d => d.day === dayOfWeek);
            if (index !== -1 && order.total && typeof order.total === 'number') {
                weeklyRevenueData[index].revenue += order.total;
            }
        });
        
        return {
            revenue,
            customers: customersSnapshot.size,
            sales: ordersSnapshot.size,
            activeOrders,
            weeklyRevenue: weeklyRevenueData,
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            revenue: 0, customers: 0, sales: 0, activeOrders: 0,
            weeklyRevenue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, revenue: 0 })),
        };
    }
}

export type StaffDashboardStats = {
    personalStockCount: number;
    pendingTransfersCount: number;
    monthlyWasteReports: number;
};

export async function getStaffDashboardStats(staffId: string): Promise<StaffDashboardStats> {
    try {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);

        // Fetch all active sales runs for the user
        const activeRunsQuery = query(
            collection(db, 'transfers'),
            where('to_staff_id', '==', staffId),
            where('status', '==', 'active')
        );
        const activeRunsSnapshot = await getDocs(activeRunsQuery);

        // Sum up the initial quantities from all active runs
        let initialStock = 0;
        activeRunsSnapshot.docs.forEach(doc => {
            const items = doc.data().items || [];
            initialStock += items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        });

        // Fetch all orders made by this user from their active sales runs
        const runIds = activeRunsSnapshot.docs.map(doc => doc.id);
        let soldStock = 0;
        if (runIds.length > 0) {
            const ordersQuery = query(collection(db, 'orders'), where('salesRunId', 'in', runIds));
            const ordersSnapshot = await getDocs(ordersQuery);
            ordersSnapshot.forEach(doc => {
                const items = doc.data().items || [];
                soldStock += items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
            });
        }
        
        // The remaining stock is the initial total minus what has been sold
        const personalStockCount = initialStock - soldStock;

        // Calculate pending transfers
        const pendingTransfersQuery = query(
            collection(db, 'transfers'),
            where('to_staff_id', '==', staffId),
            where('status', '==', 'pending')
        );
        const pendingTransfersSnapshot = await getDocs(pendingTransfersQuery);
        const pendingTransfersCount = pendingTransfersSnapshot.size;

        // Calculate waste reports for the month
        const wasteLogsQuery = query(
            collection(db, 'waste_logs'),
            where('staffId', '==', staffId),
            where('date', '>=', Timestamp.fromDate(startOfCurrentMonth))
        );
        const wasteLogsSnapshot = await getDocs(wasteLogsQuery);
        const monthlyWasteReports = wasteLogsSnapshot.size;

        return {
            personalStockCount,
            pendingTransfersCount,
            monthlyWasteReports,
        };

    } catch (error) {
        console.error("Error fetching staff dashboard stats:", error);
        return {
            personalStockCount: 0,
            pendingTransfersCount: 0,
            monthlyWasteReports: 0,
        };
    }
}


export type BakerDashboardStats = {
    activeBatches: number;
    producedThisWeek: number;
    weeklyProduction: { day: string, quantity: number }[];
};

export async function getBakerDashboardStats(): Promise<BakerDashboardStats> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekStartTimestamp = Timestamp.fromDate(weekStart);

    try {
        const activeBatchesQuery = query(collection(db, 'production_batches'), where('status', 'in', ['in_production', 'pending_approval']));
        const activeBatchesSnapshot = await getDocs(activeBatchesQuery);

        const recentCompletedQuery = query(
            collection(db, 'production_batches'), 
            where('status', '==', 'completed'), 
            where('approvedAt', '>=', weekStartTimestamp)
        );
        const recentCompletedSnapshot = await getDocs(recentCompletedQuery);
        
        let producedThisWeek = 0;
        const weeklyProductionData = eachDayOfInterval({ start: weekStart, end: endOfWeek(now) }).map(day => ({
            day: format(day, 'E'),
            quantity: 0,
        }));
        
        recentCompletedSnapshot.forEach(doc => {
            const batch = doc.data();
            const produced = batch.successfullyProduced || 0;
            producedThisWeek += produced;

            if (batch.approvedAt) {
                const approvedDate = (batch.approvedAt as Timestamp).toDate();
                 if (approvedDate >= weekStart) {
                    const dayOfWeek = format(approvedDate, 'E');
                    const index = weeklyProductionData.findIndex(d => d.day === dayOfWeek);
                    if (index !== -1) {
                        weeklyProductionData[index].quantity += produced;
                    }
                }
            }
        });

        return {
            activeBatches: activeBatchesSnapshot.size,
            producedThisWeek,
            weeklyProduction: weeklyProductionData,
        };
    } catch (error) {
        console.error("Error fetching baker dashboard stats:", error);
        return {
            activeBatches: 0,
            producedThisWeek: 0,
            weeklyProduction: eachDayOfInterval({ start: weekStart, end: endOfWeek(now) }).map(day => ({ day: format(day, 'E'), quantity: 0 })),
        };
    }
}

export type ShowroomDashboardStats = {
    dailySales: { hour: string; sales: number }[];
    topProduct: { name: string; quantity: number } | null;
    topProductsChart: { name: string; quantity: number, total: number }[];
};

export async function getShowroomDashboardStats(staffId: string): Promise<ShowroomDashboardStats> {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    try {
        const q = query(
            collection(db, 'orders'),
            where('staffId', '==', staffId),
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end))
        );
        const snapshot = await getDocs(q);

        const hourlySales = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}:00`,
            sales: 0
        }));

        const productCounts: { [productId: string]: { name: string; quantity: number, total: number } } = {};

        snapshot.forEach(doc => {
            const order = doc.data();
            const orderDate = (order.date as Timestamp).toDate();
            const hour = orderDate.getHours();
            hourlySales[hour].sales += order.total;

            order.items.forEach((item: any) => {
                if (!productCounts[item.productId]) {
                    productCounts[item.productId] = { name: item.name, quantity: 0, total: 0 };
                }
                productCounts[item.productId].quantity += item.quantity;
                productCounts[item.productId].total += item.price * item.quantity;
            });
        });
        
        let topProduct: { name: string; quantity: number } | null = null;
        if (Object.keys(productCounts).length > 0) {
            topProduct = Object.values(productCounts).reduce((max, product) => max.quantity > product.quantity ? max : product);
        }

        const topProductsChart = Object.values(productCounts)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        return {
            dailySales: hourlySales,
            topProduct,
            topProductsChart
        };

    } catch (error) {
        console.error("Error fetching showroom dashboard stats:", error);
        return {
            dailySales: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, sales: 0 })),
            topProduct: null,
            topProductsChart: []
        };
    }
}


export type SalesRun = {
    id: string;
    date: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    items: { productId: string; productName: string; price: number; quantity: number }[];
    notes?: string;
    from_staff_name?: string; 
    from_staff_id?: string;
    to_staff_name?: string;
    to_staff_id?: string;
    totalRevenue: number;
    totalCollected: number;
    totalOutstanding: number;
    time_received?: string | null;
    time_completed?: string | null;
};

type SalesRunResult = {
    active: SalesRun[];
    completed: SalesRun[];
    error?: string;
    indexUrl?: string;
}

export async function getSalesRuns(staffId: string): Promise<SalesRunResult> {
    try {
        const q = query(
            collection(db, 'transfers'),
            where('is_sales_run', '==', true),
            where('to_staff_id', '==', staffId),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const runs = await Promise.all(querySnapshot.docs.map(async (transferDoc) => {
            const data = transferDoc.data();

            let totalRevenue = 0;
            const itemsWithPrices = await Promise.all(
              (data.items || []).map(async (item: any) => {
                const productDoc = await getDoc(doc(db, 'products', item.productId));
                const price = productDoc.exists() ? productDoc.data().price : 0;
                totalRevenue += price * item.quantity;
                return { ...item, price };
              })
            );

            return {
                id: transferDoc.id,
                ...data,
                date: (data.date as Timestamp).toDate().toISOString(),
                time_received: data.time_received ? (data.time_received as Timestamp).toDate().toISOString() : null,
                time_completed: data.time_completed ? (data.time_completed as Timestamp).toDate().toISOString() : null,
                items: itemsWithPrices,
                totalRevenue,
                totalCollected: data.totalCollected || 0,
                totalOutstanding: totalRevenue - (data.totalCollected || 0),
            } as SalesRun;
        }));

        const active = runs.filter(run => run.status === 'active');
        const completed = runs.filter(run => run.status === 'completed');

        return { active, completed };

    } catch (error: any) {
        console.error("Error in getSalesRuns:", error);
        if (error.code === 'failed-precondition') {
            // Log the full error to the server console to ensure visibility
            console.error("Firestore Index Missing:", error.toString());
            // Attempt to extract the URL from the message for the UI
            const urlMatch = error.message.match(/(https?:\/\/[^\s]+)/);
            const indexUrl = urlMatch ? urlMatch[0] : undefined;
            return { active: [], completed: [], error: "A database index is required. Please check the server logs for a link to create it.", indexUrl };
        }
        return { active: [], completed: [], error: 'An unexpected error occurred while fetching sales runs.' };
    }
}

export async function getAllSalesRuns(): Promise<SalesRunResult> {
    try {
        const q = query(
            collection(db, 'transfers'),
            where('is_sales_run', '==', true),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const runs = await Promise.all(querySnapshot.docs.map(async (transferDoc) => {
            const data = transferDoc.data();
            let totalRevenue = 0;
            const itemsWithPrices = await Promise.all(
                (data.items || []).map(async (item: any) => {
                    const productDoc = await getDoc(doc(db, 'products', item.productId));
                    const price = productDoc.exists() ? productDoc.data().price : 0;
                    totalRevenue += price * item.quantity;
                    return { ...item, price };
                })
            );

            // Create a new, clean object to return
            return {
                id: transferDoc.id,
                date: (data.date as Timestamp).toDate().toISOString(),
                status: data.status,
                items: itemsWithPrices,
                notes: data.notes,
                from_staff_name: data.from_staff_name,
                from_staff_id: data.from_staff_id,
                to_staff_name: data.to_staff_name,
                to_staff_id: data.to_staff_id,
                is_sales_run: data.is_sales_run,
                totalRevenue,
                totalCollected: data.totalCollected || 0,
                totalOutstanding: totalRevenue - (data.totalCollected || 0),
                time_received: data.time_received ? (data.time_received as Timestamp).toDate().toISOString() : null,
                time_completed: data.time_completed ? (data.time_completed as Timestamp).toDate().toISOString() : null,
            } as SalesRun;
        }));

        const active = runs.filter(run => run.status === 'active');
        const completed = runs.filter(run => run.status === 'completed');

        return { active, completed };
    } catch (error: any) {
        console.error("Error fetching all sales runs:", error);
        if (error.code === 'failed-precondition') {
            const urlMatch = error.message.match(/(https?:\/\/[^\s]+)/);
            const indexUrl = urlMatch ? urlMatch[0] : undefined;
            return { active: [], completed: [], error: `A database index is required: ${urlMatch ? urlMatch[0] : 'Check logs.'}`, indexUrl };
        }
        return { active: [], completed: [], error: 'An unexpected error occurred.' };
    }
}

export async function getSalesStats(filter: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<{ totalSales: number }> {
    const now = new Date();
    let fromDate: Date;

    switch (filter) {
        case 'daily':
            fromDate = startOfDay(now);
            break;
        case 'weekly':
            fromDate = subDays(now, 7);
            break;
        case 'monthly':
            fromDate = subDays(now, 30);
            break;
        case 'yearly':
            fromDate = subDays(now, 365);
            break;
    }
    
    try {
        const q = query(
            collection(db, "transfers"),
            where("is_sales_run", "==", true),
            where("date", ">=", Timestamp.fromDate(fromDate)),
            where("date", "<=", Timestamp.fromDate(now)),
            where("status", "in", ["completed", "active"])
        );
        const snapshot = await getDocs(q);
        
        let totalSales = 0;
        for (const runDoc of snapshot.docs) {
            const runData = runDoc.data();
            totalSales += runData.totalRevenue || 0;
        }
        
        return { totalSales };
    } catch (error) {
        console.error("Error fetching sales stats:", error);
        return { totalSales: 0 };
    }
}

// ---- START NEW ACCOUNTING FUNCTIONS ----

export async function getAccountSummary(dateRange?: { from: Date, to: Date }): Promise<Record<string, number>> {
    try {
        const dateFilters = dateRange 
            ? [where("date", ">=", Timestamp.fromDate(dateRange.from)), where("date", "<=", Timestamp.fromDate(dateRange.to))]
            : [];
            
        const [
            salesSnap,
            directCostsSnap,
            closingStocksSnap,
            indirectCostsSnap,
            discountsSnap,
            wasteLogsSnap,
            debtSnap,
            // Assuming assets/equipment are not dynamic collections for this summary
        ] = await Promise.all([
            getDocs(query(collection(db, "sales"), ...dateFilters)),
            getDocs(query(collection(db, "directCosts"), ...dateFilters)),
            getDocs(collection(db, "closingStocks")), // Not date-filtered
            getDocs(query(collection(db, "indirectCosts"), ...dateFilters)),
            getDocs(collection(db, "discount_records")), // Not date-filtered
            getDocs(query(collection(db, "waste_logs"), ...dateFilters)),
            getDocs(query(collection(db, "debt"), ...dateFilters)),
        ]);

        const totalSales = salesSnap.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
        const totalPurchases = directCostsSnap.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
        const totalClosingStock = closingStocksSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalIndirectExpenses = indirectCostsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalDiscounts = discountsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const totalWaste = wasteLogsSnap.docs.reduce((sum, doc) => sum + ((doc.data().quantity || 0) * 500), 0); // Placeholder cost
        const totalLoan = debtSnap.docs.reduce((sum, doc) => sum + (doc.data().debit || 0) - (doc.data().credit || 0), 0);

        // Total Expenses = Indirect + Direct
        const totalExpenses = totalIndirectExpenses + totalPurchases;

        const totalDebtors = 3124140; // Hardcoded from image for now
        const totalAssets = 401000; // Hardcoded
        const totalEquipment = 60000000; // Hardcoded

        return {
            'Sale': totalSales,
            'Purchases (Confectioneries)': totalPurchases,
            'Closing Stock': totalClosingStock,
            'Expenses': totalExpenses,
            'Discount Allowed': totalDiscounts,
            'Bad or Damages': totalWaste,
            'Loan': totalLoan,
            'Indirect Exp': totalIndirectExpenses,
            'Assets': totalAssets,
            'Debtor': totalDebtors,
            'Equipment': totalEquipment,
        };

    } catch (error) {
        console.error("Error getting account summary:", error);
        return {};
    }
}


export async function getSales() {
    const snapshot = await getDocs(query(collection(db, "sales"), orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString();
        return { id: doc.id, ...data, date };
    });
}

export async function getDrinkSalesSummary(dateRange?: { from: Date, to: Date }) {
    try {
        const productsSnapshot = await getDocs(query(collection(db, 'products'), where('category', '==', 'Drinks')));
        const drinkProductIds = productsSnapshot.docs.map(doc => doc.id);

        if (drinkProductIds.length === 0) {
            return [];
        }

        const dateFilters = dateRange 
            ? [where("date", ">=", Timestamp.fromDate(dateRange.from)), where("date", "<=", Timestamp.fromDate(dateRange.to))]
            : [];
        const ordersSnapshot = await getDocs(query(collection(db, 'orders'), ...dateFilters));

        const drinkSales: { [productId: string]: { productName: string, quantitySold: number, totalRevenue: number, costPrice: number, stock: number } } = {};

        // Initialize with all drink products
        productsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            drinkSales[doc.id] = { productName: data.name, quantitySold: 0, totalRevenue: 0, costPrice: data.costPrice || 0, stock: data.stock || 0 };
        });

        ordersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            order.items.forEach((item: any) => {
                if (drinkProductIds.includes(item.productId)) {
                    drinkSales[item.productId].quantitySold += item.quantity;
                    drinkSales[item.productId].totalRevenue += item.quantity * item.price;
                }
            });
        });

        return Object.entries(drinkSales).map(([productId, data]) => ({
            productId,
            ...data
        }));

    } catch (error) {
        console.error("Error getting drink sales summary:", error);
        return [];
    }
}


export async function getDebtRecords() {
    const snapshot = await getDocs(query(collection(db, "debt"), orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString();
        return { id: doc.id, ...data, date };
    });
}

export async function getDirectCosts() {
    const snapshot = await getDocs(query(collection(db, "directCosts"), orderBy("date", "desc")));
     return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString();
        return { id: doc.id, ...data, date };
    });
}

export async function getIndirectCosts() {
    const snapshot = await getDocs(query(collection(db, "indirectCosts"), orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString();
        return { id: doc.id, ...data, date };
    });
}

export async function getClosingStocks(category?: 'products' | 'ingredients') {
    const collections = [];
    if (category === 'products' || !category) {
        collections.push(getDocs(collection(db, "products")).then(snap => 
            snap.docs.map(doc => {
                const data = doc.data();
                return { 
                    name: data.name, 
                    value: (data.stock || 0) * (data.costPrice || 0),
                    quantity: data.stock || 0,
                    unit: data.unit || 'pcs',
                }
            })
        ));
    }
    if (category === 'ingredients' || !category) {
        collections.push(getDocs(collection(db, "ingredients")).then(snap => 
            snap.docs.map(doc => {
                const data = doc.data();
                return { 
                    name: data.name, 
                    value: (data.stock || 0) * (data.costPerUnit || 0),
                    quantity: data.stock || 0,
                    unit: data.unit || 'unit',
                }
            })
        ));
    }
    const results = await Promise.all(collections);
    return results.flat();
}

export async function getDiscountRecords() {
    const snapshot = await getDocs(query(collection(db, "discount_records")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


export async function getWages(dateRange?: { from: Date, to: Date }) {
    const dateFilters = dateRange 
        ? [where("date", ">=", Timestamp.fromDate(dateRange.from)), where("date", "<=", Timestamp.fromDate(dateRange.to))]
        : [];
    const snapshot = await getDocs(query(collection(db, "wages"), ...dateFilters, orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString();
        return { id: doc.id, ...data, date };
    });
}

export async function getFinancialSummary() {
    try {
        const salesQuery = await getDocs(collection(db, "sales"));
        const directCostsQuery = await getDocs(collection(db, "directCosts"));
        const indirectCostsQuery = await getDocs(collection(db, "indirectCosts"));

        const totalRevenue = salesQuery.docs.reduce((sum, doc) => sum + doc.data().total, 0);
        const totalDirectCosts = directCostsQuery.docs.reduce((sum, doc) => sum + doc.data().total, 0);
        const totalIndirectCosts = indirectCostsQuery.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

        const totalExpenditure = totalDirectCosts + totalIndirectCosts;
        const grossProfit = totalRevenue - totalDirectCosts;
        const netProfit = grossProfit - totalIndirectCosts;

        return {
            totalRevenue,
            totalExpenditure,
            grossProfit,
            netProfit
        };
    } catch(error) {
        console.error("Error fetching financial summary:", error);
        return { totalRevenue: 0, totalExpenditure: 0, grossProfit: 0, netProfit: 0 };
    }
}

export type ProfitAndLossStatement = {
    sales: number;
    openingStock: number;
    purchases: number;
    carriageInward: number;
    costOfGoodsAvailable: number;
    closingStock: number;
    cogs: number;
    grossProfit: number;
    expenses: { 
        [key: string]: number 
    };
    expenseDetails: {
        Utilities: number;
        Operations: number;
        Wages: number;
    };
    totalExpenses: number;
    netProfit: number;
};

export async function getProfitAndLossStatement(dateRange?: { from: Date, to: Date }): Promise<ProfitAndLossStatement> {
    try {
        const dateFilters = dateRange 
            ? [where("date", ">=", Timestamp.fromDate(dateRange.from)), where("date", "<=", Timestamp.fromDate(dateRange.to))]
            : [];
        
        // Fetch all necessary data in parallel
        const [
            salesSnapshot,
            directCostsSnapshot,
            closingStocks,
            indirectCostsSnapshot,
            wagesSnapshot,
            wasteLogsSnapshot,
            discountsSnapshot
        ] = await Promise.all([
            getDocs(query(collection(db, "sales"), ...dateFilters)),
            getDocs(query(collection(db, "directCosts"), ...dateFilters)),
            getClosingStocks(), // Not filtered by date
            getDocs(query(collection(db, "indirectCosts"), ...dateFilters)),
            getDocs(query(collection(db, "wages"), ...dateFilters, orderBy("date", "desc"))),
            getDocs(query(collection(db, "waste_logs"), ...dateFilters)),
            getDocs(collection(db, "discount_records"))
        ]);

        // Trading Account Calculations
        const sales = salesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
        const purchases = directCostsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
        
        const openingStock = 848626; 
        const carriageInward = 7500; 
        
        const closingStockValue = closingStocks.reduce((sum, item) => sum + (item.value || 0), 0);
        const costOfGoodsAvailable = openingStock + purchases + carriageInward;
        const cogs = costOfGoodsAvailable - closingStockValue;
        const grossProfit = sales - cogs;

        // P&L Expenses Calculations (only from indirect costs now)
        const expenses: { [key: string]: number } = {};
        const expenseDetails = {
            Utilities: 0,
            Operations: 0,
            Wages: 0,
        };

        indirectCostsSnapshot.forEach(doc => {
            const data = doc.data();
            const amount = data.amount || 0;
            const category = data.category || 'Other';
            expenses[category] = (expenses[category] || 0) + amount;
        });
        
        const totalExpenses = Object.values(expenses).reduce((sum, value) => sum + value, 0);
        const netProfit = grossProfit - totalExpenses;

        return {
            sales,
            openingStock,
            purchases,
            carriageInward,
            costOfGoodsAvailable,
            closingStock: closingStockValue,
            cogs,
            grossProfit,
            expenses,
            expenseDetails, // This seems to be unused now, but keeping for structure
            totalExpenses,
            netProfit
        };

    } catch (error) {
        console.error("Error generating P&L statement:", error);
        return {
            sales: 0, openingStock: 0, purchases: 0, carriageInward: 0, costOfGoodsAvailable: 0,
            closingStock: 0, cogs: 0, grossProfit: 0, expenses: {}, expenseDetails: { Utilities: 0, Operations: 0, Wages: 0 }, totalExpenses: 0, netProfit: 0
        };
    }
}


type DirectCostData = { description: string; category: string; quantity: number; total: number; };
export async function addDirectCost(data: DirectCostData) {
    try {
        await addDoc(collection(db, 'directCosts'), {
            ...data,
            date: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding direct cost:", error);
        return { success: false, error: 'Failed to add direct cost.' };
    }
}

type IndirectCostData = { description: string; category: string; amount: number; };
export async function addIndirectCost(data: IndirectCostData) {
    try {
        await addDoc(collection(db, 'indirectCosts'), {
            ...data,
            date: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding indirect cost:", error);
        return { success: false, error: 'Failed to add indirect cost.' };
    }
}

// ---- END NEW ACCOUNTING FUNCTIONS ----

// --- START PAYROLL FUNCTIONS ---

export async function getStaffList() {
    try {
        const q = query(collection(db, "staff"), where("is_active", "==", true));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            name: docSnap.data().name,
            role: docSnap.data().role,
            pay_rate: docSnap.data().pay_rate || 0,
            pay_type: docSnap.data().pay_type || 'Salary',
        }));
    } catch (error) {
        console.error("Error fetching staff list:", error);
        return [];
    }
}

type PayrollData = {
    staffId: string;
    staffName: string;
    role: string;
    basePay: number;
    additions: number;
    deductions: {
        shortages: number;
        advanceSalary: number;
        debt: number;
        fine: number;
    };
    netPay: number;
    month: string;
};

export async function processPayroll(payrollData: PayrollData[], period: string) {
    try {
        const batch = writeBatch(db);

        const bakerRoles = ['Chief Baker', 'Baker', 'Bakery Assistant'];

        payrollData.forEach(data => {
            const wageRef = doc(collection(db, 'wages'));
            batch.set(wageRef, { ...data, date: serverTimestamp() });
            
            const expenseCollection = bakerRoles.includes(data.role) ? 'directCosts' : 'indirectCosts';
            const expenseRef = doc(collection(db, expenseCollection));

            batch.set(expenseRef, {
                description: `Salary for ${data.staffName} (${period})`,
                category: 'Salary',
                amount: data.netPay, // Log net pay as the expense
                quantity: 1, // for directCosts schema
                total: data.netPay, // for directCosts schema
                date: serverTimestamp()
            });
        });
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error processing payroll:", error);
        return { success: false, error: "Failed to process payroll." };
    }
}

// --- END PAYROLL FUNCTIONS ---

export type Creditor = {
    id: string;
    name: string;
    contactPerson: string;
    amountOwed: number;
    amountPaid: number;
    balance: number;
}

export async function getCreditors(): Promise<Creditor[]> {
    try {
        const q = query(collection(db, "suppliers"), where("amountOwed", ">", 0));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const balance = (data.amountOwed || 0) - (data.amountPaid || 0);
            return {
                id: docSnap.id,
                name: data.name,
                contactPerson: data.contactPerson,
                amountOwed: data.amountOwed || 0,
                amountPaid: data.amountPaid || 0,
                balance: balance
            }
        }).filter(c => c.balance > 0);
    } catch (error) {
        console.error("Error fetching creditors:", error);
        return [];
    }
}

export type Debtor = {
    id: string;
    name: string;
    phone: string;
    amountOwed: number;
    amountPaid: number;
    balance: number;
}

export async function getDebtors(): Promise<Debtor[]> {
    try {
        // Query for customers where amountOwed > amountPaid
        const q = query(collection(db, "customers"));
        const snapshot = await getDocs(q);

        return snapshot.docs
            .map(docSnap => {
                const data = docSnap.data();
                const amountOwed = data.amountOwed || 0;
                const amountPaid = data.amountPaid || 0;
                return {
                    id: docSnap.id,
                    name: data.name,
                    phone: data.phone,
                    amountOwed: amountOwed,
                    amountPaid: amountPaid,
                    balance: amountOwed - amountPaid
                };
            })
            .filter(d => d.balance > 0);

    } catch (error) {
        console.error("Error fetching debtors:", error);
        return [];
    }
}


export type Expense = {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
}

export async function getExpenses(dateRange: { from: string, to: string }): Promise<Expense[]> {
     const { from, to } = dateRange;
     try {
        const q = query(
            collection(db, "expenses"),
            where("date", ">=", from),
            where("date", "<=", to),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Expense));
     } catch(error) {
        console.error("Error fetching expenses:", error);
        return [];
     }
}

export async function handleLogPayment(supplierId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    try {
        const batch = writeBatch(db);

        // 1. Update supplier's amountPaid
        const supplierRef = doc(db, "suppliers", supplierId);
        batch.update(supplierRef, { amountPaid: increment(amount) });

        // 2. Add a corresponding expense record
        const expenseRef = doc(collection(db, "indirectCosts"));
        const supplierDoc = await getDoc(supplierRef);
        const supplierName = supplierDoc.exists() ? supplierDoc.data().name : 'Unknown Supplier';
        batch.set(expenseRef, {
            category: "Creditor Payments",
            description: `Payment to supplier: ${supplierName}`,
            amount: amount,
            date: serverTimestamp()
        });
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error logging payment:", error);
        return { success: false, error: "Failed to log payment." };
    }
}

export async function handleAddExpense(expenseData: Omit<Expense, 'id' | 'date'>): Promise<{ success: boolean; error?: string }> {
    try {
        await addDoc(collection(db, "expenses"), {
            ...expenseData,
            date: new Date().toISOString()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding expense:", error);
        return { success: false, error: "Failed to add expense." };
    }
}

export type PaymentConfirmation = {
  id: string;
  date: string; // Changed to string
  driverId: string;
  driverName: string;
  runId: string;
  amount: number;
  status: 'pending' | 'approved' | 'declined';
  customerName: string;
  items: { productId: string; quantity: number, price: number, name: string }[];
  isDebtPayment?: boolean;
  customerId?: string;
  paymentMethod: 'Cash' | 'POS' | 'Paystack';
};


export async function getPaymentConfirmations(): Promise<PaymentConfirmation[]> {
  try {
    const q = query(
      collection(db, 'payment_confirmations'),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const date = data.date as Timestamp;
        return { 
            id: docSnap.id,
             ...data,
            date: date.toDate().toISOString(), // Convert to string
        } as PaymentConfirmation
    });
  } catch (error) {
    console.error("Error fetching payment confirmations:", error);
    return [];
  }
}

export async function handlePaymentConfirmation(confirmationId: string, action: 'approve' | 'decline'): Promise<{ success: boolean; error?: string }> {
    const confirmationRef = doc(db, 'payment_confirmations', confirmationId);

    try {
        await runTransaction(db, async (transaction) => {
            const confirmationDoc = await transaction.get(confirmationRef);
            if (!confirmationDoc.exists()) {
                throw new Error("Confirmation not found.");
            }
            const confirmationData = confirmationDoc.data() as PaymentConfirmation;
            if (confirmationData.status !== 'pending') {
                throw new Error("This confirmation has already been processed.");
            }
            
            const isFromSalesRun = confirmationData.runId && !confirmationData.runId.startsWith('pos-sale-');
            let customerRef, runRef;
            let runData: SalesRun | null = null;
            
            if (isFromSalesRun) {
                runRef = doc(db, 'transfers', confirmationData.runId);
                const runDoc = await transaction.get(runRef);
                if (runDoc.exists()) {
                    runData = runDoc.data() as SalesRun;
                }
            }
            if (confirmationData.isDebtPayment && confirmationData.customerId) {
                customerRef = doc(db, 'customers', confirmationData.customerId);
                await transaction.get(customerRef);
            }
            
            const newStatus = action === 'approve' ? 'approved' : 'declined';
            
            if (action === 'approve') {
                const newOrderRef = doc(collection(db, 'orders'));
                transaction.set(newOrderRef, {
                    salesRunId: confirmationData.runId,
                    customerId: confirmationData.customerId || 'walk-in',
                    customerName: confirmationData.customerName,
                    total: confirmationData.amount,
                    paymentMethod: confirmationData.paymentMethod,
                    date: Timestamp.now(),
                    staffId: confirmationData.driverId,
                    status: 'Completed',
                    items: confirmationData.items,
                    id: newOrderRef.id,
                    isDebtPayment: confirmationData.isDebtPayment || false,
                });
                
                if (confirmationData.isDebtPayment && customerRef) {
                    transaction.update(customerRef, { amountPaid: increment(confirmationData.amount) });
                }

                if (isFromSalesRun && runRef && runData) {
                    const newTotalCollected = (runData.totalCollected || 0) + confirmationData.amount;
                    transaction.update(runRef, { totalCollected: newTotalCollected });
                    
                    // Auto-complete run if total collected matches total revenue
                    if (newTotalCollected >= (runData.totalRevenue || 0)) {
                        transaction.update(runRef, {
                            status: 'completed',
                            time_completed: serverTimestamp()
                        });
                    }

                } else if (!isFromSalesRun) {
                     const salesDocId = format(new Date(), 'yyyy-MM-dd');
                    const salesDocRef = doc(db, 'sales', salesDocId);
                    const salesDoc = await transaction.get(salesDocRef); 
                    const paymentField = confirmationData.paymentMethod === 'Cash' ? 'cash' : (confirmationData.paymentMethod === 'POS' ? 'pos' : 'transfer');
                    
                    if (salesDoc.exists()) {
                        transaction.update(salesDocRef, {
                            [paymentField]: increment(confirmationData.amount),
                            total: increment(confirmationData.amount)
                        });
                    } else {
                        transaction.set(salesDocRef, {
                            date: Timestamp.fromDate(startOfDay(new Date())),
                            description: `Daily Sales for ${format(new Date(), 'yyyy-MM-dd')}`,
                            cash: confirmationData.paymentMethod === 'Cash' ? confirmationData.amount : 0,
                            pos: confirmationData.paymentMethod === 'POS' ? confirmationData.amount : 0,
                            transfer: 0,
                            creditSales: 0,
                            shortage: 0,
                            total: confirmationData.amount
                        });
                    }
                }
            }
            
            transaction.update(confirmationRef, { status: newStatus });
        });

        return { success: true };
    } catch (error) {
        console.error("Error handling payment confirmation:", error);
        return { success: false, error: `Failed to ${action} payment. ${(error as Error).message}` };
    }
}


export type Announcement = {
    id: string;
    staffId: string;
    staffName: string;
    message: string;
    timestamp: Timestamp | null;
}

export async function getAnnouncements(): Promise<Announcement[]> {
    try {
        const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id,
                staffId: data.staffId,
                staffName: data.staffName,
                message: data.message,
                timestamp: data.timestamp, // Keep as Timestamp
            } as Announcement
        });
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return [];
    }
}

export async function postAnnouncement(message: string, user: { staff_id: string, name: string }): Promise<{ success: boolean, error?: string }> {
    if (!message.trim()) {
        return { success: false, error: 'Announcement message cannot be empty.' };
    }
    try {
        await addDoc(collection(db, 'announcements'), {
            message,
            staffId: user.staff_id,
            staffName: user.name,
            timestamp: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error posting announcement:", error);
        return { success: false, error: 'Failed to post announcement.' };
    }
}

type ReportSubmission = {
    subject: string;
    reportType: string;
    message: string;
    user: { staff_id: string, name: string };
};

export async function submitReport(data: ReportSubmission): Promise<{ success: boolean; error?: string }> {
    const { subject, reportType, message, user } = data;

    if (!subject.trim() || !reportType || !message.trim()) {
        return { success: false, error: "Please fill out all fields." };
    }

    try {
        await addDoc(collection(db, 'reports'), {
            subject,
            reportType,
            message,
            staffId: user.staff_id,
            staffName: user.name,
            timestamp: serverTimestamp(),
            status: 'new' // New, In Progress, Resolved
        });
        return { success: true };
    } catch (error) {
        console.error("Error submitting report:", error);
        return { success: false, error: "Failed to submit report." };
    }
}

export type Report = {
    id: string;
    subject: string;
    reportType: string;
    message: string;
    staffId: string;
    staffName: string;
    timestamp: Timestamp;
    status: 'new' | 'in_progress' | 'resolved';
}

export async function getReports(): Promise<Report[]> {
    try {
        const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id,
                ...data
            } as Report;
        });
    } catch (error) {
        console.error("Error fetching reports:", error);
        return [];
    }
}

export async function updateReportStatus(reportId: string, newStatus: Report['status']): Promise<{ success: boolean; error?: string }> {
    try {
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, { status: newStatus });
        return { success: true };
    } catch (error) {
        console.error("Error updating report status:", error);
        return { success: false, error: "Failed to update report status." };
    }
}

type ReportWasteData = {
    items: { productId: string; quantity: number; productName?: string; productCategory?: string; }[];
    reason: string;
    notes?: string;
};

export async function handleReportWaste(data: ReportWasteData, user: { staff_id: string, name: string, role: string }): Promise<{success: boolean, error?: string}> {
    if (!data.items || data.items.length === 0 || !data.reason) {
        return { success: false, error: "Please provide items and a reason for the waste." };
    }
    
    try {
        const isAdminOrStorekeeper = ['Manager', 'Developer', 'Supervisor', 'Storekeeper'].includes(user.role);
        
        await runTransaction(db, async (transaction) => {
             for (const item of data.items) {
                if (!item.productId || !item.quantity || item.quantity <= 0) continue;
                
                let productRef;
                let stockField = 'stock';

                if (isAdminOrStorekeeper) {
                    productRef = doc(db, 'products', item.productId);
                } else {
                    productRef = doc(db, 'staff', user.staff_id, 'personal_stock', item.productId);
                }
                
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) throw new Error(`Product with ID ${item.productId} not found in relevant inventory.`);
                
                if ((productDoc.data()?.[stockField] || 0) < item.quantity) {
                    throw new Error(`Not enough stock for ${item.productName} in your inventory.`);
                }
                transaction.update(productRef, { [stockField]: increment(-item.quantity) });


                const wasteLogRef = doc(collection(db, 'waste_logs'));
                transaction.set(wasteLogRef, {
                    productId: item.productId,
                    productName: item.productName || 'Unknown',
                    productCategory: item.productCategory || 'Unknown',
                    quantity: item.quantity,
                    reason: data.reason,
                    notes: data.notes || '',
                    staffId: user.staff_id,
                    staffName: user.name,
                    date: serverTimestamp()
                });
             }
        });

        return { success: true };

    } catch (error) {
        console.error("Error reporting waste:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to report waste.";
        return { success: false, error: errorMessage };
    }
}

export type WasteLog = {
    id: string;
    productId: string;
    productName: string;
    productCategory: string;
    quantity: number;
    reason: string;
    notes?: string;
    staffId: string;
    staffName: string;
    date: string;
}

export async function getWasteLogs(): Promise<WasteLog[]> {
    try {
        const q = query(collection(db, 'waste_logs'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const date = data.date as Timestamp;
            return {
                id: docSnap.id,
                ...data,
                date: date.toDate().toISOString(),
            } as WasteLog;
        });
    } catch (error) {
        console.error("Error fetching waste logs:", error);
        return [];
    }
}

export async function getWasteLogsForStaff(staffId: string): Promise<WasteLog[]> {
    try {
        const q = query(
            collection(db, 'waste_logs'),
            where('staffId', '==', staffId),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const date = data.date as Timestamp;
            return {
                id: docSnap.id,
                ...data,
                date: date.toDate().toISOString(),
            } as WasteLog;
        });
    } catch (error: any) {
        if (error.code === 'failed-precondition') {
            console.error("Firestore index missing for getWasteLogsForStaff. Please create it in the Firebase console.", error.message);
            return []; // Intentionally return empty on index error to avoid crash
        } else {
            console.error("Error fetching waste logs for staff:", error);
        }
        return [];
    }
}


export type Transfer = {
  id: string;
  from_staff_id: string;
  from_staff_name: string;
  to_staff_id: string;
  to_staff_name: string;
  items: { productId: string; productName: string; quantity: number, price?: number }[];
  date: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  totalValue?: number;
  is_sales_run?: boolean;
  notes?: string;
  time_received?: string | null;
  time_completed?: string | null;
};


export async function getPendingTransfersForStaff(staffId: string): Promise<Transfer[]> {
    try {
        const q = query(
            collection(db, 'transfers'),
            where('to_staff_id', '==', staffId),
            where('status', '==', 'pending'),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const transfers = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let totalValue = 0;

            const itemsWithPrices = await Promise.all(
                (data.items || []).map(async (item: any) => {
                    const productDoc = await getDoc(doc(db, 'products', item.productId));
                    const price = productDoc.exists() ? productDoc.data().price : 0;
                    totalValue += price * item.quantity;
                    return { ...item, price };
                })
            );

            return { 
                id: docSnap.id,
                ...data,
                items: itemsWithPrices,
                totalValue,
                date: (data.date as Timestamp).toDate().toISOString(),
             } as Transfer;
        }));
        return transfers;

    } catch (error: any) {
        if (error.code === 'failed-precondition') {
            const urlMatch = error.message.match(/(https?:\/\/[^\s]+)/);
            const indexUrl = urlMatch ? urlMatch[0] : undefined;
            return [];
        } else {
            console.error("Error fetching pending transfers:", error);
        }
        return [];
    }
}

export async function getReturnedStockTransfers(): Promise<Transfer[]> {
    try {
        const q = query(
            collection(db, 'transfers'),
            where('status', '==', 'pending'),
            where('notes', '>=', 'Return from'),
            where('notes', '<', 'Return from' + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                date: (data.date as Timestamp).toDate().toISOString(),
            } as Transfer;
        });
    } catch(error) {
        console.error("Error getting returned stock transfers:", error);
        return [];
    }
}

export async function getCompletedTransfersForStaff(staffId: string): Promise<Transfer[]> {
    try {
        const q = query(
            collection(db, 'transfers'),
            where('to_staff_id', '==', staffId),
            where('status', 'in', ['completed', 'active']),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const plainData: { [key: string]: any } = {};

            for (const key in data) {
                if (data[key] instanceof Timestamp) {
                    plainData[key] = data[key].toDate().toISOString();
                } else {
                    plainData[key] = data[key];
                }
            }
            return {
                id: docSnap.id,
                ...plainData,
            } as Transfer;
        });
    } catch (error: any) {
        if (error.code === 'failed-precondition') {
            console.error("Firestore index missing for getCompletedTransfersForStaff. Please create it in the Firebase console.", error.message);
        } else {
            console.error("Error fetching completed transfers for staff:", error);
        }
        return [];
    }
}

export async function handleAcknowledgeTransfer(transferId: string, action: 'accept' | 'decline'): Promise<{success: boolean, error?: string}> {
    const transferRef = doc(db, 'transfers', transferId);

    if (action === 'decline') {
        try {
            await updateDoc(transferRef, { status: 'cancelled' });
            return { success: true };
        } catch (error) {
            console.error("Error declining transfer:", error);
            return { success: false, error: "Failed to decline transfer." };
        }
    }

    try {
        await runTransaction(db, async (transaction) => {
            const transferDoc = await transaction.get(transferRef);
            if (!transferDoc.exists()) throw new Error("Transfer does not exist.");

            const transfer = transferDoc.data() as Transfer;
            if (transfer.status !== 'pending') throw new Error("This transfer has already been processed.");
            
            const isReturn = transfer.notes?.startsWith('Return from');

            if (isReturn) {
                 // Return from production or sales run goes back to main inventory
                for (const item of transfer.items) {
                    const productRef = doc(db, 'products', item.productId);
                    transaction.update(productRef, { stock: increment(item.quantity) });
                }
            } else { // This is for both regular stock transfers and sales runs
                // These reads must happen before any writes
                const productRefs = transfer.items.map(item => doc(db, 'products', item.productId));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
                const staffStockRefs = transfer.items.map(item => doc(db, 'staff', transfer.to_staff_id, 'personal_stock', item.productId));
                const staffStockDocs = await Promise.all(staffStockRefs.map(ref => transaction.get(ref)));

                for (let i = 0; i < transfer.items.length; i++) {
                    const item = transfer.items[i];
                    const productDoc = productDocs[i];
                    const staffStockDoc = staffStockDocs[i];

                    if (!productDoc.exists() || (productDoc.data().stock || 0) < item.quantity) {
                        throw new Error(`Not enough stock for ${item.productName} in main inventory.`);
                    }

                    // Decrement main inventory
                    transaction.update(productRefs[i], { stock: increment(-item.quantity) });

                    // Increment or set staff personal stock
                    if (staffStockDoc.exists()) {
                        transaction.update(staffStockRefs[i], { stock: increment(item.quantity) });
                    } else {
                        transaction.set(staffStockRefs[i], {
                            productId: item.productId,
                            productName: item.productName,
                            stock: item.quantity,
                        });
                    }
                }
            }
            
            // This is a write, happens after all reads
            const newStatus = transfer.is_sales_run ? 'active' : 'completed';
            transaction.update(transferRef, { 
                status: newStatus,
                time_received: serverTimestamp(),
                time_completed: transfer.is_sales_run ? null : serverTimestamp() 
            });
        });

        return { success: true };

    } catch (error) {
        console.error("Error accepting transfer:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to accept transfer.";
        return { success: false, error: errorMessage };
    }
}

export type ProductionBatch = {
    id: string;
    recipeId: string;
    recipeName: string;
    productId: string;
    productName: string;
    requestedById: string;
    requestedByName: string;
    quantityToProduce: number;
    status: 'pending_approval' | 'in_production' | 'completed' | 'declined';
    createdAt: string; 
    approvedAt?: string;
    ingredients: { 
        ingredientId: string; 
        quantity: number; 
        unit: string; 
        ingredientName: string;
        openingStock?: number;
        closingStock?: number;
    }[];
    successfullyProduced?: number;
    wasted?: number;
};


export async function getProductionBatches(): Promise<{ pending: ProductionBatch[], in_production: ProductionBatch[], completed: ProductionBatch[] }> {
    try {
        const q = query(collection(db, 'production_batches'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const allBatches = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const createdAt = (data.createdAt as Timestamp)?.toDate().toISOString();
            const approvedAt = (data.approvedAt as Timestamp)?.toDate().toISOString();
            return {
                id: docSnap.id,
                ...data,
                createdAt,
                approvedAt,
            } as ProductionBatch;
        });
        
        const pending = allBatches.filter(b => b.status === 'pending_approval');
        const in_production = allBatches.filter(b => b.status === 'in_production');
        const completed = allBatches.filter(b => b.status === 'completed');

        return { pending, in_production, completed };
    } catch (error) {
        console.error("Error fetching production batches:", error);
        return { pending: [], in_production: [], completed: [] };
    }
}

async function createProductionLog(action: string, details: string, user: { staff_id: string, name: string }) {
    try {
        await addDoc(collection(db, "production_logs"), {
            action,
            details,
            staffId: user.staff_id,
            staffName: user.name,
            timestamp: serverTimestamp()
        });
    } catch (logError) {
        console.error("Failed to create production log:", logError);
    }
}

export async function startProductionBatch(data: Omit<ProductionBatch, 'id' | 'status' | 'createdAt' | 'approvedAt'>, user: { staff_id: string, name: string }): Promise<{success: boolean, error?: string}> {
    try {
        const newBatchRef = doc(collection(db, "production_batches"));
        await setDoc(newBatchRef, {
            ...data,
            id: newBatchRef.id,
            status: 'pending_approval',
            createdAt: serverTimestamp()
        });
        await createProductionLog('Batch Requested', `Requested ${data.quantityToProduce} of ${data.productName} for batch ${newBatchRef.id}`, user);
        return { success: true };
    } catch (error) {
        console.error("Error starting production batch:", error);
        return { success: false, error: "Failed to start production batch." };
    }
}

export async function approveIngredientRequest(batchId: string, ingredients: { ingredientId: string, quantity: number, ingredientName: string, unit: string }[], user: { staff_id: string, name: string }): Promise<{success: boolean, error?: string}> {
    const batchRef = doc(db, 'production_batches', batchId);

    // Transaction for batch and ingredient updates
    try {
        await runTransaction(db, async (transaction) => {
            const batchDoc = await transaction.get(batchRef);
            if (!batchDoc.exists() || batchDoc.data()?.status !== 'pending_approval') {
                throw new Error("Batch is not pending approval.");
            }

            const ingredientRefs = ingredients.map(ing => doc(db, 'ingredients', ing.ingredientId));
            const ingredientDocs = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));
            const ingredientsWithStock = [];

            for (let i = 0; i < ingredientDocs.length; i++) {
                const ingDoc = ingredientDocs[i];
                const reqIng = ingredients[i];
                if (!ingDoc.exists() || (ingDoc.data()?.stock || 0) < reqIng.quantity) {
                    throw new Error(`Not enough stock for ${reqIng.ingredientName}.`);
                }
                const currentStock = ingDoc.data()?.stock || 0;
                ingredientsWithStock.push({ ...reqIng, openingStock: currentStock, closingStock: currentStock - reqIng.quantity });
                transaction.update(ingredientRefs[i], { stock: increment(-reqIng.quantity) });
            }

            transaction.update(batchRef, { 
                status: 'in_production', 
                approvedAt: serverTimestamp(),
                ingredients: ingredientsWithStock
            });
        });
    } catch (error) {
        console.error("Error in main transaction for ingredient request:", error);
        return { success: false, error: (error as Error).message };
    }
    
    // Separate transaction for logging
    try {
        const logRef = doc(collection(db, 'ingredient_stock_logs'));
        const batchDocForLog = await getDoc(batchRef);
        const batchData = batchDocForLog.data();
        const requesterName = batchData?.requestedByName || 'Unknown';
        await setDoc(logRef, {
            ingredientId: '',
            ingredientName: `Production Batch: ${batchData?.productName}`,
            change: -ingredients.reduce((sum, ing) => sum + ing.quantity, 0),
            reason: `Production: ${batchData?.productName}`,
            date: serverTimestamp(),
            staffName: requesterName,
            logRefId: batchId,
        });
         await createProductionLog('Batch Approved', `Approved batch for ${batchData?.quantityToProduce} of ${batchData?.productName}: ${batchDocForLog.id}`, user);
    } catch (logError) {
         console.error("Error creating stock log for request:", logError);
         // Don't fail the whole operation if logging fails
    }

    return { success: true };
}


export async function declineProductionBatch(batchId: string, user: { staff_id: string, name: string }): Promise<{success: boolean, error?: string}> {
    try {
        const batchRef = doc(db, 'production_batches', batchId);
        await updateDoc(batchRef, { status: 'declined' });
        
        const batchDoc = await getDoc(batchRef);
        const batchData = batchDoc.data();
        await createProductionLog('Batch Declined', `Declined batch for ${batchData?.quantityToProduce} of ${batchData?.productName}: ${batchId}`, user);

        return { success: true };
    } catch (error) {
        console.error("Error declining production batch:", error);
        return { success: false, error: "Failed to decline batch." };
    }
}


type CompleteBatchData = {
    batchId: string;
    productId: string;
    productName: string;
    successfullyProduced: number;
    wasted: number;
    storekeeperId: string; // ID for the storekeeper role
}

export async function completeProductionBatch(data: CompleteBatchData, user: { staff_id: string, name: string }): Promise<{success: boolean, error?: string}> {
    try {
        await runTransaction(db, async (transaction) => {
            const batchRef = doc(db, 'production_batches', data.batchId);
            const storekeeperDoc = await transaction.get(doc(db, 'staff', data.storekeeperId));
            
            if (!storekeeperDoc.exists()) {
                throw new Error("Target storekeeper does not exist.");
            }

            transaction.update(batchRef, {
                status: 'completed',
                successfullyProduced: data.successfullyProduced,
                wasted: data.wasted
            });

            if (data.successfullyProduced > 0) {
                const transferRef = doc(collection(db, 'transfers'));
                transaction.set(transferRef, {
                    from_staff_id: user.staff_id,
                    from_staff_name: user.name,
                    to_staff_id: data.storekeeperId,
                    to_staff_name: storekeeperDoc.data().name,
                    items: [{
                        productId: data.productId,
                        productName: data.productName,
                        quantity: data.successfullyProduced
                    }],
                    date: serverTimestamp(),
                    status: 'pending',
                    is_sales_run: false,
                    notes: `Return from production batch ${data.batchId}`
                });
            }

            if (data.wasted > 0) {
                const wasteLogRef = doc(collection(db, 'waste_logs'));
                transaction.set(wasteLogRef, {
                    productId: data.productId,
                    productName: data.productName,
                    productCategory: 'Breads', // TODO: This should be dynamic
                    quantity: data.wasted,
                    reason: 'Production Waste',
                    notes: `From production batch ${data.batchId}`,
                    staffId: user.staff_id,
                    staffName: user.name,
                    date: serverTimestamp()
                });
            }
        });
        
        await createProductionLog('Batch Completed', `Completed batch of ${data.productName} with ${data.successfullyProduced} produced and ${data.wasted} wasted: ${data.batchId}`, user);

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to complete production batch.";
        console.error("Error completing production batch:", error);
        return { success: false, error: errorMessage };
    }
}

export type ProductionLog = {
    id: string;
    action: string;
    details: string;
    staffId: string;
    staffName: string;
    timestamp: string;
}

export async function getProductionLogs(): Promise<ProductionLog[]> {
    try {
        const q = query(collection(db, 'production_logs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const timestamp = (data.timestamp as Timestamp)?.toDate().toISOString();
            return {
                id: docSnap.id,
                ...data,
                timestamp,
            } as ProductionLog;
        });
    } catch (error) {
        console.error("Error fetching production logs:", error);
        return [];
    }
}


export async function getSalesRunDetails(runId: string): Promise<SalesRun | null> {
    try {
        const runDoc = await getDoc(doc(db, 'transfers', runId));
        if (!runDoc.exists()) {
            return null;
        }

        const data = runDoc.data();
        let totalRevenue = 0;
        const itemsWithPrices = await Promise.all(
          (data.items || []).map(async (item: any) => {
            const productDoc = await getDoc(doc(db, 'products', item.productId));
            const price = productDoc.exists() ? productDoc.data().price : 0;
            totalRevenue += price * item.quantity;
            return { ...item, price };
          })
        );
        
        return {
            id: runDoc.id,
            date: (data.date as Timestamp).toDate().toISOString(),
            status: data.status,
            items: itemsWithPrices,
            notes: data.notes,
            from_staff_name: data.from_staff_name,
            from_staff_id: data.from_staff_id,
            to_staff_name: data.to_staff_name,
            to_staff_id: data.to_staff_id,
            totalRevenue,
            totalCollected: data.totalCollected || 0,
            totalOutstanding: totalRevenue - (data.totalCollected || 0),
            time_received: data.time_received ? (data.time_received as Timestamp).toDate().toISOString() : null,
            time_completed: data.time_completed ? (data.time_completed as Timestamp).toDate().toISOString() : null,
            is_sales_run: data.is_sales_run || false,
        };

    } catch (error) {
        console.error("Error fetching sales run details:", error);
        return null;
    }
}


export async function checkForMissingIndexes(): Promise<{ requiredIndexes: string[] }> {
    const checks = [
        () => getDocs(query(collection(db, 'transfers'), where('is_sales_run', '==', true), orderBy('date', 'desc'))),
        () => getDocs(query(collection(db, 'transfers'), where('is_sales_run', '==', true), where('to_staff_id', '==', 'test'), orderBy('date', 'desc'))),
        () => getDocs(query(collection(db, 'waste_logs'), where('staffId', '==', 'test'), orderBy('date', 'desc'))),
        () => getDocs(query(collection(db, 'transfers'), where('to_staff_id', '==', 'test'), where('status', '==', 'pending'), orderBy('date', 'desc'))),
        () => getDocs(query(collection(db, 'transfers'), where('to_staff_id', '==', 'test'), where('status', 'in', ['completed', 'active']), orderBy('date', 'desc'))),
    ];

    const missingIndexes = new Set<string>();

    for (const check of checks) {
        try {
            await check();
        } catch (error: any) {
            if (error.code === 'failed-precondition') {
                const urlMatch = error.message.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    missingIndexes.add(urlMatch[0]);
                }
            }
        }
    }
    
    return { requiredIndexes: Array.from(missingIndexes) };
}

export async function getCustomersForRun(runId: string): Promise<any[]> {
  try {
    const q = query(collection(db, "orders"), where("salesRunId", "==", runId));
    const snapshot = await getDocs(q);
    
    const salesByCustomer: Record<string, { customerId: string, customerName: string, totalSold: number, totalPaid: number }> = {};

    snapshot.docs.forEach(docSnap => {
      const order = docSnap.data();
      const customerId = order.customerId || 'walk-in';
      const customerName = order.customerName || 'Walk-in';
      
      if (!salesByCustomer[customerId]) {
        salesByCustomer[customerId] = { customerId, customerName, totalSold: 0, totalPaid: 0 };
      }
      
      // Only add to totalSold if it's not a debt payment
      if (!order.isDebtPayment) {
        salesByCustomer[customerId].totalSold += order.total;
      }
      
      // Add to totalPaid for any completed order, including debt payments
      if (order.status === 'Completed') {
        salesByCustomer[customerId].totalPaid += order.total;
      }
    });

    return Object.values(salesByCustomer);
  } catch (error) {
    console.error("Error fetching customers for run:", error);
    return [];
  }
}

export async function getOrdersForRun(runId: string): Promise<any[]> {
    try {
        const q = query(collection(db, "orders"), where("salesRunId", "==", runId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                date: (data.date as Timestamp).toDate().toISOString()
            }
        });
    } catch (error) {
        console.error("Error fetching orders for run:", error);
        return [];
    }
}

type SaleData = {
    runId: string;
    items: { productId: string; quantity: number; price: number, name: string }[];
    customerId: string;
    customerName: string;
    paymentMethod: 'Cash' | 'Credit' | 'Paystack';
    staffId: string;
    total: number;
}

export async function handleSellToCustomer(data: SaleData): Promise<{ success: boolean; error?: string, orderId?: string }> {
    try {
        const orderId = await runTransaction(db, async (transaction) => {
            const staffDoc = await transaction.get(doc(db, 'staff', data.staffId));
            if (!staffDoc.exists()) throw new Error("Operating staff not found.");
            
            const driverName = staffDoc.data()?.name || 'Unknown';
            const runRef = doc(db, 'transfers', data.runId);
            
            // Create new order
            const newOrderRef = doc(collection(db, 'orders'));
            transaction.set(newOrderRef, {
                salesRunId: data.runId,
                customerId: data.customerId,
                customerName: data.customerName,
                items: data.items,
                total: data.total,
                paymentMethod: data.paymentMethod,
                date: Timestamp.now(),
                staffId: data.staffId,
                staffName: driverName,
                status: 'Completed',
                id: newOrderRef.id,
                isDebtPayment: false,
            });

            // Decrement personal stock
            for (const item of data.items) {
                const stockRef = doc(db, 'staff', data.staffId, 'personal_stock', item.productId);
                const stockDoc = await transaction.get(stockRef);
                if (!stockDoc.exists() || (stockDoc.data()?.stock || 0) < item.quantity) {
                    throw new Error(`Not enough stock for ${item.name}.`);
                }
                transaction.update(stockRef, { stock: increment(-item.quantity) });
            }

            // Update run totals for direct payments (Paystack) or credit
            if (data.paymentMethod === 'Paystack') {
                transaction.update(runRef, { totalCollected: increment(data.total) });
            }
            
            if (data.paymentMethod === 'Credit') {
                const customerRef = doc(db, 'customers', data.customerId);
                transaction.update(customerRef, { amountOwed: increment(data.total) });
            }
            
            if (data.paymentMethod === 'Cash') {
                const confirmationRef = doc(collection(db, 'payment_confirmations'));
                transaction.set(confirmationRef, {
                    runId: data.runId,
                    customerId: data.customerId,
                    customerName: data.customerName,
                    items: data.items,
                    amount: data.total,
                    driverId: data.staffId,
                    driverName: driverName,
                    date: serverTimestamp(),
                    status: 'pending',
                    paymentMethod: 'Cash',
                    isDebtPayment: false,
                });
            }
            return newOrderRef.id;
        });

        return { success: true, orderId };

    } catch (error) {
        console.error("Error selling to customer:", error);
        return { success: false, error: (error as Error).message };
    }
}

type PosSaleData = {
    items: { productId: string; quantity: number; price: number, name: string, costPrice: number }[];
    customerName: string;
    paymentMethod: 'Cash' | 'POS' | 'Paystack';
    staffId: string;
    staffName: string;
    total: number;
    date: Timestamp;
}
export async function handlePosSale(data: PosSaleData): Promise<{ success: boolean; error?: string, orderId?: string }> {
    const newOrderRef = doc(collection(db, 'orders'));
    const orderDate = data.date.toDate();

    try {
        await runTransaction(db, async (transaction) => {
            const stockRefs = data.items.map(item => doc(db, 'staff', data.staffId, 'personal_stock', item.productId));
            for(const ref of stockRefs) {
                const stockDoc = await transaction.get(ref);
                 if (!stockDoc.exists()) {
                    throw new Error(`Stock record not found for an item.`);
                }
            }
            const salesDocId = format(orderDate, 'yyyy-MM-dd');
            const salesDocRef = doc(db, 'sales', salesDocId);
            await transaction.get(salesDocRef);

            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                const stockRef = stockRefs[i];
                transaction.update(stockRef, { stock: increment(-item.quantity) });
            }
            
            const orderData = {
                id: newOrderRef.id,
                salesRunId: `pos-sale-${newOrderRef.id}`,
                customerId: 'walk-in',
                customerName: data.customerName,
                items: data.items,
                total: data.total,
                paymentMethod: data.paymentMethod,
                date: data.date,
                staffId: data.staffId,
                staffName: data.staffName,
                status: 'Completed',
            };
            
            transaction.set(newOrderRef, orderData);
            
            const paymentField = data.paymentMethod === 'Cash' ? 'cash' : (data.paymentMethod === 'POS' ? 'pos' : 'transfer');
            const salesDoc = await getDoc(salesDocRef);
            if (salesDoc.exists()) {
                transaction.update(salesDocRef, {
                    [paymentField]: increment(data.total),
                    total: increment(data.total)
                });
            } else {
                transaction.set(salesDocRef, {
                    date: Timestamp.fromDate(startOfDay(orderDate)),
                    description: `Daily Sales for ${salesDocId}`,
                    cash: data.paymentMethod === 'Cash' ? data.total : 0,
                    pos: data.paymentMethod === 'POS' ? data.total : 0,
                    transfer: data.paymentMethod === 'Paystack' ? data.total : 0,
                    creditSales: 0,
                    shortage: 0,
                    total: data.total
                });
            }
        });

        return { success: true, orderId: newOrderRef.id };
    } catch (error) {
        console.error("Error processing POS sale:", error);
        return { success: false, error: (error as Error).message };
    }
}



type PaymentData = {
    runId: string;
    customerId: string;
    customerName: string;
    driverId: string;
    driverName: string;
    amount: number;
}
export async function handleRecordCashPaymentForRun(data: PaymentData): Promise<{ success: boolean; error?: string }> {
    try {
        await addDoc(collection(db, 'payment_confirmations'), {
            runId: data.runId,
            customerId: data.customerId,
            customerName: data.customerName,
            amount: data.amount,
            driverId: data.driverId,
            driverName: data.driverName,
            date: serverTimestamp(),
            status: 'pending',
            items: [], // Not a new sale, so no items
            isDebtPayment: true,
            paymentMethod: 'Cash' // Assuming debt payments are cash
        });
        return { success: true };
    } catch (error) {
        console.error("Error recording cash payment:", error);
        return { success: false, error: "Failed to record cash payment for approval." };
    }
}

// Recipe Actions with Logging
export async function handleSaveRecipe(recipeData: Omit<any, 'id'>, recipeId?: string) {
    // This server action is intentionally empty.
    // The logic has been moved to a client-side function that calls other specific server actions.
}

export async function handleDeleteRecipe(recipeId: string, recipeName: string) {
    // This server action is intentionally empty.
    // The logic has been moved to a client-side function that calls other specific server actions.
}


export async function getRecipes(): Promise<any[]> {
    const snapshot = await getDocs(collection(db, "recipes"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function getProducts(): Promise<any[]> {
    const snapshot = await getDocs(collection(db, "products"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function getIngredients(): Promise<any[]> {
    const snapshot = await getDocs(collection(db, "ingredients"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export type SupplyLog = {
    id: string;
    supplierId: string;
    supplierName: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
    date: string;
    invoiceNumber?: string;
  };

export type IngredientStockLog = {
    id: string;
    ingredientId: string;
    ingredientName: string;
    change: number;
    reason: string;
    date: string;
    staffName: string;
    logRefId?: string; // To link to supply_logs or production_batches
};

export async function getIngredientStockLogs(): Promise<IngredientStockLog[]> {
    try {
        const q = query(collection(db, 'ingredient_stock_logs'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const date = (data.date as Timestamp)?.toDate().toISOString();
            return { id: docSnap.id, ...data, date } as IngredientStockLog;
        });
    } catch (error) {
        console.error("Error fetching ingredient stock logs:", error);
        return [];
    }
}

export async function getProductionBatch(batchId: string): Promise<ProductionBatch | null> {
    try {
        const docRef = doc(db, 'production_batches', batchId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                approvedAt: data.approvedAt ? (data.approvedAt as Timestamp).toDate().toISOString() : undefined,
            } as ProductionBatch;
        }
        return null;
    } catch (error) {
        console.error("Error fetching production batch:", error);
        return null;
    }
}

export async function getSupplyLog(logId: string): Promise<SupplyLog | null> {
    try {
        const docRef = doc(db, 'supply_logs', logId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date as Timestamp).toDate().toISOString(),
            } as SupplyLog;
        }
        return null;
    } catch (error) {
        console.error("Error fetching supply log:", error);
        return null;
    }
}


export async function getStaffByRole(role: string): Promise<any[]> {
    const q = query(collection(db, "staff"), where("role", "==", role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const plainData: { [key: string]: any } = {};

        for (const key in data) {
            if (data[key] instanceof Timestamp) {
                plainData[key] = data[key].toDate().toISOString();
            } else {
                plainData[key] = data[key];
            }
        }
        return { id: doc.id, ...plainData };
    });
}

export async function initializePaystackTransaction(data: any): Promise<{ success: boolean; error?: string, reference?: string }> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return { success: false, error: "Paystack secret key is not configured." };
    
    try {
        const staffDoc = await getDoc(doc(db, "staff", data.staffId));
        const staffName = staffDoc.exists() ? staffDoc.data()?.name : "Unknown";

        const metadata = {
            customer_name: data.customerName,
            staff_id: data.staffId,
            staff_name: staffName,
            cart: data.items,
            isPosSale: data.isPosSale || false,
            isDebtPayment: data.isDebtPayment || false,
            runId: data.runId || null,
            customerId: data.customerId || null,
        };

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: data.email,
                amount: Math.round(data.total * 100), // amount in kobo
                metadata,
            }),
        });

        const responseData = await response.json();

        if (responseData.status) {
            return { success: true, reference: responseData.data.reference };
        } else {
            return { success: false, error: responseData.message };
        }
    } catch (error) {
        console.error('Paystack initialization error:', error);
        return { success: false, error: 'An unknown error occurred while initializing payment.' };
    }
}

export async function verifyPaystackOnServerAndFinalizeOrder(reference: string): Promise<{ success: boolean; error?: string, orderId?: string }> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return { success: false, error: "Paystack secret key is not configured." };

    try {
        const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        const verificationData = await verifyResponse.json();
        
        if (!verificationData || !verificationData.status || verificationData.data.status !== 'success') {
            return { success: false, error: verificationData.message || 'Payment verification failed.' };
        }
        
        const metadata = verificationData.data.metadata;
        if (!metadata) {
            return { success: false, error: 'Transaction metadata is missing or corrupt.'}
        }
        
        const amountPaid = verificationData.data.amount / 100;
        const transactionDate = Timestamp.fromDate(new Date(verificationData.data.paid_at || verificationData.data.transaction_date));

        if (metadata.isPosSale) {
            const posSaleData: PosSaleData = {
                items: metadata.cart,
                customerName: metadata.customer_name,
                paymentMethod: 'Paystack',
                staffId: metadata.staff_id,
                staffName: metadata.staff_name,
                total: amountPaid,
                date: transactionDate,
            };
            return await handlePosSale(posSaleData);
        }
        
        if (metadata.isDebtPayment) {
            if (!metadata.runId || !metadata.customerId) {
                 return { success: false, error: 'Metadata for debt payment is incomplete.'}
            }
            await runTransaction(db, async (transaction) => {
                const runRef = doc(db, 'transfers', metadata.runId);
                const customerRef = doc(db, 'customers', metadata.customerId);
                transaction.update(runRef, { totalCollected: increment(amountPaid) });
                transaction.update(customerRef, { amountPaid: increment(amountPaid) });
            });
            return { success: true, orderId: `debt-payment-${reference}` };
        }

        if (metadata.runId) {
             const saleData: SaleData = {
                runId: metadata.runId,
                items: metadata.cart,
                customerId: metadata.customerId || 'walk-in',
                customerName: metadata.customer_name,
                paymentMethod: 'Paystack',
                staffId: metadata.staff_id,
                total: amountPaid,
            };
            return await handleSellToCustomer(saleData);
        }
        
        return { success: false, error: 'Could not determine transaction type from metadata.'}


    } catch (error) {
        console.error("Error finalizing order:", error);
        return { success: false, error: "Failed to finalize the order after payment verification." };
    }
}

// ------ STOCK APPROVAL WORKFLOW ------
export async function requestStockIncrease(data: { ingredientId: string; quantity: number; supplierId: string }, user: { staff_id: string; name: string }) {
    try {
        const { ingredientId, quantity, supplierId } = data;
        const ingredientDoc = await getDoc(doc(db, 'ingredients', ingredientId));
        const supplierDoc = await getDoc(doc(db, 'suppliers', supplierId));

        if (!ingredientDoc.exists() || !supplierDoc.exists()) {
            return { success: false, error: "Invalid ingredient or supplier." };
        }

        const newRequestRef = doc(collection(db, 'supply_requests'));
        await setDoc(newRequestRef, {
            ...data,
            ingredientName: ingredientDoc.data().name,
            supplierName: supplierDoc.data().name,
            requesterId: user.staff_id,
            requesterName: user.name,
            status: 'pending',
            requestDate: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error requesting stock increase:", error);
        return { success: false, error: "Failed to create stock request." };
    }
}

export type SupplyRequest = {
    id: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    supplierId: string;
    supplierName: string;
    requesterId: string;
    requesterName: string;
    status: 'pending' | 'approved' | 'declined';
    requestDate: string; // Changed to string
    costPerUnit?: number;
    totalCost?: number;
};

export async function getPendingSupplyRequests(): Promise<SupplyRequest[]> {
    const q = query(collection(db, 'supply_requests'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        const requestDate = data.requestDate as Timestamp;
        return { 
            id: d.id, 
            ...data,
            requestDate: requestDate.toDate().toISOString(),
        } as SupplyRequest;
    });
}

export async function approveStockIncrease(requestId: string, costPerUnit: number, totalCost: number, user: { staff_id: string; name: string }) {
    const requestRef = doc(db, 'supply_requests', requestId);
    const requestDoc = await getDoc(requestRef);
    if(!requestDoc.exists() || requestDoc.data()?.status !== 'pending') {
        return { success: false, error: "Request not found or already processed." };
    }
    const requestData = requestDoc.data() as SupplyRequest;

    try {
        const batch = writeBatch(db);

        // Update the original request to 'approved'
        batch.update(requestRef, {
            status: 'approved',
            costPerUnit: costPerUnit,
            totalCost: totalCost,
            approverId: user.staff_id,
            approverName: user.name,
            approvedDate: serverTimestamp()
        });

        // Update ingredient stock
        const ingredientRef = doc(db, 'ingredients', requestData.ingredientId);
        batch.update(ingredientRef, { stock: increment(requestData.quantity), costPerUnit: costPerUnit });

        // Update supplier amount owed
        const supplierRef = doc(db, 'suppliers', requestData.supplierId);
        batch.update(supplierRef, { amountOwed: increment(totalCost) });

        // Add to Direct Costs
        const directCostRef = doc(collection(db, 'directCosts'));
        batch.set(directCostRef, {
            description: `Purchase of ${requestData.ingredientName} from ${requestData.supplierName}`,
            category: 'Ingredients',
            quantity: requestData.quantity,
            total: totalCost,
            date: serverTimestamp()
        });

        // Create an ingredient stock log
        const stockLogRef = doc(collection(db, 'ingredient_stock_logs'));
        batch.set(stockLogRef, {
            ingredientId: requestData.ingredientId,
            ingredientName: requestData.ingredientName,
            change: requestData.quantity,
            reason: `Purchase from ${requestData.supplierName} (Approved)`,
            date: serverTimestamp(),
            staffName: requestData.requesterName,
            logRefId: requestId,
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error("Error approving stock increase:", error);
        return { success: false, error: "Failed to approve stock increase." };
    }
}


export async function declineStockIncrease(requestId: string, user: { staff_id: string; name: string }) {
    try {
        const requestRef = doc(db, 'supply_requests', requestId);
        await updateDoc(requestRef, {
            status: 'declined',
            approverId: user.staff_id,
            approverName: user.name,
            approvedDate: serverTimestamp()
        });
        return { success: true };
    } catch(error) {
         console.error("Error declining stock increase:", error);
        return { success: false, error: "Failed to decline request." };
    }
}

export async function handleReturnStock(runId: string, unsoldItems: { productId: string, productName: string, quantity: number }[], user: { staff_id: string, name: string }): Promise<{success: boolean, error?: string}> {
    try {
        if (unsoldItems.length === 0) {
            return { success: true }; // Nothing to return
        }
        
        const storekeeperQuery = query(collection(db, "staff"), where("role", "==", "Storekeeper"), limit(1));
        const storekeeperSnapshot = await getDocs(storekeeperQuery);
        if (storekeeperSnapshot.empty) {
            throw new Error("No storekeeper found to return stock to.");
        }
        const storekeeper = storekeeperSnapshot.docs[0].data();
        const storekeeperId = storekeeperSnapshot.docs[0].id;
        
        await runTransaction(db, async (transaction) => {
            const transferRef = doc(collection(db, 'transfers'));
            transaction.set(transferRef, {
                from_staff_id: user.staff_id,
                from_staff_name: user.name,
                to_staff_id: storekeeperId,
                to_staff_name: storekeeper.name,
                items: unsoldItems,
                date: serverTimestamp(),
                status: 'pending',
                is_sales_run: false,
                notes: `Return from Sales Run ${runId}`
            });
        });
        
        return { success: true };
    } catch (error) {
        console.error("Error returning stock from sales run:", error);
        return { success: false, error: (error as Error).message || "An unexpected error occurred." };
    }
}

export async function handleCompleteRun(runId: string): Promise<{success: boolean, error?: string}> {
    try {
        await runTransaction(db, async (transaction) => {
            // All reads must come before all writes
            const runRef = doc(db, 'transfers', runId);
            const runDoc = await transaction.get(runRef);
            
            if (!runDoc.exists()) throw new Error("Sales run not found.");
            
            const runData = runDoc.data();
            if (runData.status !== 'active') throw new Error("This run is not active or has already been completed.");

            const ordersQuery = query(collection(db, 'orders'), where('salesRunId', '==', runId));
            const ordersSnapshot = await getDocs(ordersQuery); // This read is now before writes.

            const salesDocId = format(runData.date.toDate(), 'yyyy-MM-dd');
            const salesDocRef = doc(db, 'sales', salesDocId);
            const salesDoc = await transaction.get(salesDocRef);

            // Calculations based on reads
            const creditSales = ordersSnapshot.docs
                .filter(doc => doc.data().paymentMethod === 'Credit')
                .reduce((sum, doc) => sum + doc.data().total, 0);

            const expectedCash = (runData.totalRevenue || 0) - creditSales;
            const cashCollected = runData.totalCollected || 0;
            const shortage = expectedCash - cashCollected;
            
            // All writes happen here at the end
            transaction.update(runRef, {
                status: 'completed',
                time_completed: serverTimestamp()
            });
            
            if (Math.abs(shortage) > 0.01) { // Use a small epsilon for float comparison
                if (salesDoc.exists()) {
                    transaction.update(salesDocRef, { shortage: increment(shortage) });
                } else {
                     transaction.set(salesDocRef, {
                        date: runData.date,
                        description: `Daily Sales for ${salesDocId}`,
                        cash: 0, pos: 0, transfer: 0, creditSales: 0,
                        total: 0,
                        shortage: shortage
                    });
                }
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error completing sales run:", error);
        return { success: false, error: (error as Error).message || "An unexpected error occurred." };
    }
}
