
"use server";

import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, addDoc, updateDoc, Timestamp, serverTimestamp, writeBatch, increment, deleteDoc, runTransaction, setDoc } from "firebase/firestore";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, eachDayOfInterval, format } from "date-fns";
import { db } from "@/lib/firebase";
import fetch from 'node-fetch';

type LoginResult = {
  success: boolean;
  error?: string;
  user?: {
    name: string;
    role: string;
    staff_id: string;
    email: string;
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
        email: userData.email,
      } 
    };
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: errorMessage };
  }
}

type InitializePaystackResult = {
    success: boolean;
    authorization_url?: string;
    error?: string;
}

export async function initializePaystackTransaction(orderPayload: any): Promise<InitializePaystackResult> {
    const secretKey = process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        console.error("Paystack secret key is not configured.");
        return { success: false, error: "Paystack secret key is not configured." };
    }

    const url = "https://api.paystack.co/transaction/initialize";
    const amountInKobo = Math.round(orderPayload.total * 100);

    // Create a temporary order document to get an ID for the reference
    const tempOrderRef = doc(collection(db, "temp_orders"));
    await setDoc(tempOrderRef, { ...orderPayload, createdAt: serverTimestamp() });
    
    const reference = tempOrderRef.id;

    const fields = {
        email: orderPayload.email || 'customer@example.com',
        amount: amountInKobo.toString(),
        reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment/callback`,
        metadata: {
            orderId: reference,
            cancel_action: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/sales-runs/${orderPayload.runId}?payment_status=cancelled`,
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fields),
        });

        const result = await response.json() as any;

        if (result.status === true) {
            return { success: true, authorization_url: result.data.authorization_url };
        } else {
            console.error("Paystack API Error:", result.message);
            // Clean up the temporary order if initialization fails
            await deleteDoc(tempOrderRef);
            return { success: false, error: result.message };
        }
    } catch (error) {
        console.error("Paystack connection error:", error);
        return { success: false, error: "Failed to connect to Paystack." };
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
        ordersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            revenue += order.total;
            if (order.status === 'Pending') {
                activeOrders++;
            }
        });

        // New Customers
        const customersQuery = query(collection(db, "customers"), where("joinedDate", ">=", startOfCurrentMonth.toISOString()), where("joinedDate", "<=", endOfCurrentMonth.toISOString()));
        const customersSnapshot = await getDocs(customersQuery);


        // Weekly Revenue for chart
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfDay(now);
        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const weeklyRevenueData = daysInWeek.map(day => ({
            day: format(day, 'E'), // Mon, Tue, etc.
            revenue: 0,
        }));
        
        const weeklyOrdersQuery = query(
            collection(db, "orders"), 
            where("date", ">=", weekStart.toISOString()),
            where("date", "<=", weekEnd.toISOString())
        );
        const weeklyOrdersSnapshot = await getDocs(weeklyOrdersQuery);
        
        weeklyOrdersSnapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            const orderDate = new Date(order.date);
            const dayOfWeek = format(orderDate, 'E'); 
            const index = weeklyRevenueData.findIndex(d => d.day === dayOfWeek);
            if (index !== -1) {
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

type StaffDashboardStats = {
    personalStockCount: number;
    pendingTransfersCount: number;
    monthlyWasteReports: number;
};

export async function getStaffDashboardStats(staffId: string): Promise<StaffDashboardStats> {
    try {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);

        // 1. Get personal stock count
        const personalStockQuery = collection(db, 'staff', staffId, 'personal_stock');
        const personalStockSnapshot = await getDocs(personalStockQuery);
        const personalStockCount = personalStockSnapshot.docs.reduce((sum, doc) => sum + doc.data().stock, 0);

        // 2. Get pending transfers count
        const pendingTransfersQuery = query(
            collection(db, 'transfers'),
            where('to_staff_id', '==', staffId),
            where('status', '==', 'pending')
        );
        const pendingTransfersSnapshot = await getDocs(pendingTransfersQuery);
        const pendingTransfersCount = pendingTransfersSnapshot.size;

        // 3. Get waste reports count for the month
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
            const date = data.date as Timestamp;

            let totalRevenue = 0;
            const itemsWithPrices = await Promise.all(
              data.items.map(async (item: any) => {
                const productDoc = await getDoc(doc(db, 'products', item.productId));
                const price = productDoc.exists() ? productDoc.data().price : 0;
                totalRevenue += price * item.quantity;
                return { ...item, price };
              })
            );

            return {
                id: transferDoc.id,
                ...data,
                date: date.toDate().toISOString(),
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
            const date = data.date as Timestamp;

            let totalRevenue = 0;
            const itemsWithPrices = await Promise.all(
              data.items.map(async (item: any) => {
                const productDoc = await getDoc(doc(db, 'products', item.productId));
                const price = productDoc.exists() ? productDoc.data().price : 0;
                totalRevenue += price * item.quantity;
                return { ...item, price };
              })
            );

            return {
                id: transferDoc.id,
                ...data,
                date: date.toDate().toISOString(),
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
        console.error("Error fetching all sales runs:", error);
        if (error.code === 'failed-precondition') {
            return { active: [], completed: [], error: error.message, indexUrl: error.message.match(/(https?:\/\/[^\s]+)/)?.[0] };
        }
        return { active: [], completed: [], error: 'An unexpected error occurred.' };
    }
}


export type AccountingReport = {
    sales: number;
    costOfGoodsSold: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
}

export async function getAccountingReport(dateRange: { from: Date, to: Date }): Promise<AccountingReport> {
    const from = startOfDay(dateRange.from).toISOString();
    const to = endOfDay(dateRange.to).toISOString();

    try {
        // --- Calculate Sales & COGS---
        const ordersQuery = query(
            collection(db, "orders"),
            where("date", ">=", from),
            where("date", "<=", to),
            where("status", "==", "Completed")
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        
        let sales = 0;
        let costOfGoodsSold = 0;
        
        for(const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            sales += order.total;
            for(const item of order.items) {
                // Use the cost price stored *at the time of sale* in the order document
                costOfGoodsSold += (item.costPrice || 0) * item.quantity;
            };
        };
        
        // --- Calculate Expenses ---
        const expensesQuery = query(
            collection(db, "expenses"),
            where("date", ">=", from),
            where("date", "<=", to)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expenses = expensesSnapshot.docs.reduce((sum, expenseDoc) => sum + expenseDoc.data().amount, 0);
        
        // --- Final Calculations ---
        const grossProfit = sales - costOfGoodsSold;
        const netProfit = grossProfit - expenses;

        return {
            sales,
            costOfGoodsSold,
            grossProfit,
            expenses,
            netProfit
        };

    } catch (error) {
        console.error("Error generating accounting report:", error);
        return { sales: 0, costOfGoodsSold: 0, grossProfit: 0, expenses: 0, netProfit: 0 };
    }
}

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

export async function getExpenses(dateRange: { from: Date, to: Date }): Promise<Expense[]> {
     const from = startOfDay(dateRange.from).toISOString();
     const to = endOfDay(dateRange.to).toISOString();
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
        const expenseRef = doc(collection(db, "expenses"));
        const supplierDoc = await getDoc(supplierRef);
        const supplierName = supplierDoc.exists() ? supplierDoc.data().name : 'Unknown Supplier';
        batch.set(expenseRef, {
            category: "Creditor Payments",
            description: `Payment to supplier: ${supplierName}`,
            amount: amount,
            date: new Date().toISOString()
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
};


export async function getPaymentConfirmations(): Promise<PaymentConfirmation[]> {
  try {
    const q = query(
      collection(db, 'payment_confirmations'),
      where('status', '==', 'pending'),
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
            if (!confirmationDoc.exists() || confirmationDoc.data().status !== 'pending') {
                throw new Error("This confirmation has already been processed.");
            }
            const confirmationData = confirmationDoc.data() as PaymentConfirmation;
            const newStatus = action === 'approve' ? 'approved' : 'declined';
            
            if (action === 'approve') {
                const runRef = doc(db, 'transfers', confirmationData.runId);

                if (confirmationData.isDebtPayment) {
                    // --- Handle Debt Payment ---
                    if (confirmationData.customerId) {
                        const customerRef = doc(db, 'customers', confirmationData.customerId);
                        transaction.update(customerRef, { amountPaid: increment(confirmationData.amount) });
                    }
                    transaction.update(runRef, { totalCollected: increment(confirmationData.amount) });

                } else {
                    // --- Handle New Sale ---
                    const productCostPromises = confirmationData.items.map(item => getDoc(doc(db, 'products', item.productId)));
                    const productDocs = await Promise.all(productCostPromises);
                    const itemsWithCost = confirmationData.items.map((item, index) => {
                        const costPrice = productDocs[index].exists() ? productDocs[index].data()?.costPrice : 0;
                        return {...item, costPrice };
                    });
                    
                    const newOrderRef = doc(collection(db, 'orders'));
                    const orderData = {
                        id: newOrderRef.id,
                        salesRunId: confirmationData.runId,
                        customerId: confirmationData.customerId || 'walk-in',
                        customerName: confirmationData.customerName,
                        items: itemsWithCost, // Use items with cost price
                        total: confirmationData.amount,
                        paymentMethod: 'Cash', // Approved cash sales are logged
                        date: new Date().toISOString(),
                        staffId: confirmationData.driverId,
                        status: 'Completed',
                    };
                    
                    for (const item of confirmationData.items) {
                        const stockRef = doc(db, 'staff', confirmationData.driverId, 'personal_stock', item.productId);
                        const stockDoc = await transaction.get(stockRef);
                        if (!stockDoc.exists() || stockDoc.data().stock < item.quantity) {
                           throw new Error(`Not enough stock for ${item.name}.`);
                        }
                        transaction.update(stockRef, { stock: increment(-item.quantity) });
                    }
                    
                    transaction.set(newOrderRef, orderData);
                    transaction.update(runRef, { totalCollected: increment(confirmationData.amount) });
                }
            }

            // Update the confirmation status regardless of sale type
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
    timestamp: string; // Changed from Timestamp to string
}

export async function getAnnouncements(): Promise<Announcement[]> {
    try {
        const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const timestamp = data.timestamp as Timestamp;
            return { 
                id: docSnap.id,
                staffId: data.staffId,
                staffName: data.staffName,
                message: data.message,
                timestamp: timestamp.toDate().toISOString(), // Convert to string
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

type ReportWasteData = {
    productId: string;
    productName: string;
    productCategory: string;
    quantity: number;
    reason: string;
    notes?: string;
};

// This function now reports waste from a specific user's personal stock
export async function handleReportWaste(data: ReportWasteData, user: { staff_id: string, name: string }): Promise<{success: boolean, error?: string}> {
    if (!data.productId || !data.quantity || !data.reason) {
        return { success: false, error: "Please fill out all required fields." };
    }
    
    try {
        const staffStockRef = doc(db, 'staff', user.staff_id, 'personal_stock', data.productId);
        const wasteLogRef = doc(collection(db, 'waste_logs'));

        await runTransaction(db, async (transaction) => {
            const staffStockDoc = await transaction.get(staffStockRef);
            if (!staffStockDoc.exists() || staffStockDoc.data().stock < data.quantity) {
                throw new Error("Not enough personal stock to report as waste.");
            }

            // 1. Decrement personal stock
            transaction.update(staffStockRef, { stock: increment(-data.quantity) });

            // 2. Create a waste log entry
            transaction.set(wasteLogRef, {
                ...data,
                staffId: user.staff_id,
                staffName: user.name,
                date: serverTimestamp()
            });
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
                data.items.map(async (item: any) => {
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
            console.error("Firestore index missing for getPendingTransfersForStaff. Please create it in the Firebase console.", error.message);
        } else {
            console.error("Error fetching pending transfers:", error);
        }
        return [];
    }
}

export async function getCompletedTransfersForStaff(staffId: string): Promise<Transfer[]> {
    try {
        const q = query(
            collection(db, 'transfers'),
            where('to_staff_id', '==', staffId),
            where('status', '==', 'completed'),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id,
                ...data,
                date: (data.date as Timestamp).toDate().toISOString(),
             } as Transfer
        });
    } catch (error: any) {
         if (error.code === 'failed-precondition') {
            console.error("Firestore index missing for getCompletedTransfersForStaff. Please create it in the Firebase console.", error.message);
        } else {
            console.error("Error fetching completed transfers:", error);
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
            if (transferDoc.data().status !== 'pending') throw new Error("This transfer has already been processed.");
            
            const transfer = transferDoc.data() as Transfer;

            const productRefs: any[] = [];
            const staffStockRefs: any[] = [];
            
            for (const item of transfer.items) {
                productRefs.push(doc(db, 'products', item.productId));
                staffStockRefs.push(doc(db, 'staff', transfer.to_staff_id, 'personal_stock', item.productId));
            }

            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
            const staffStockDocs = await Promise.all(staffStockRefs.map(ref => transaction.get(ref)));
            
            for (let i = 0; i < transfer.items.length; i++) {
                const item = transfer.items[i];
                const productDoc = productDocs[i];
                if (!productDoc.exists() || productDoc.data().stock < item.quantity) {
                    throw new Error(`Not enough stock for ${item.productName} in main inventory.`);
                }
            }
            
            for (let i = 0; i < transfer.items.length; i++) {
                const item = transfer.items[i];
                const productRef = productRefs[i];
                const staffStockRef = staffStockRefs[i];
                const staffStockDoc = staffStockDocs[i];

                transaction.update(productRef, { stock: increment(-item.quantity) });

                if (staffStockDoc.exists()) {
                    transaction.update(staffStockRef, { stock: increment(item.quantity) });
                } else {
                    transaction.set(staffStockRef, { 
                        productId: item.productId,
                        productName: item.productName,
                        stock: item.quantity
                    });
                }
            }
            
            const newStatus = transferDoc.data().is_sales_run ? 'active' : 'completed';
            transaction.update(transferRef, { status: newStatus });
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
    status: 'pending_approval' | 'in_production' | 'completed';
    createdAt: string; 
    ingredients: { ingredientId: string, quantity: number, unit: string }[];
    successfullyProduced?: number;
    wasted?: number;
};


export async function getProductionBatches(): Promise<{ pending: ProductionBatch[], in_production: ProductionBatch[] }> {
    try {
        const q = query(collection(db, 'production_batches'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const allBatches = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: docSnap.id,
                ...data,
                createdAt: createdAt.toDate().toISOString(),
            } as ProductionBatch;
        });
        
        const pending = allBatches.filter(b => b.status === 'pending_approval');
        const in_production = allBatches.filter(b => b.status === 'in_production');

        return { pending, in_production };
    } catch (error) {
        console.error("Error fetching production batches:", error);
        return { pending: [], in_production: [] };
    }
}

export async function startProductionBatch(data: Omit<ProductionBatch, 'id' | 'status' | 'createdAt'>): Promise<{success: boolean, error?: string}> {
    try {
        await addDoc(collection(db, "production_batches"), {
            ...data,
            status: 'pending_approval',
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error starting production batch:", error);
        return { success: false, error: "Failed to start production batch." };
    }
}

export async function approveIngredientRequest(batchId: string, ingredients: ProductionBatch['ingredients']): Promise<{success: boolean, error?: string}> {
    try {
        await runTransaction(db, async (transaction) => {
            const batchRef = doc(db, 'production_batches', batchId);
            const batchDoc = await transaction.get(batchRef);
            if (!batchDoc.exists() || batchDoc.data().status !== 'pending_approval') {
                throw new Error("Batch is not pending approval.");
            }

            // Check stock and prepare updates
            for (const ing of ingredients) {
                const ingRef = doc(db, 'ingredients', ing.ingredientId);
                const ingDoc = await transaction.get(ingRef);
                if (!ingDoc.exists() || ingDoc.data().stock < ing.quantity) {
                    throw new Error(`Not enough stock for ingredient ID: ${ing.ingredientId}`);
                }
                transaction.update(ingRef, { stock: increment(-ing.quantity) });
            }

            // Update batch status
            transaction.update(batchRef, { status: 'in_production' });
        });
        return { success: true };
    } catch (error) {
        console.error("Error approving ingredient request:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to approve request.";
        return { success: false, error: errorMessage };
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
            
            // 1. Update the production batch document
            transaction.update(batchRef, {
                status: 'completed',
                successfullyProduced: data.successfullyProduced,
                wasted: data.wasted
            });

            // 2. Create a transfer to the main inventory (for storekeeper to accept)
            if (data.successfullyProduced > 0) {
                const transferRef = doc(collection(db, 'transfers'));
                transaction.set(transferRef, {
                    from_staff_id: user.staff_id,
                    from_staff_name: user.name,
                    to_staff_id: data.storekeeperId,
                    to_staff_name: 'Main Store',
                    items: [{
                        productId: data.productId,
                        productName: data.productName,
                        quantity: data.successfullyProduced
                    }],
                    date: serverTimestamp(),
                    status: 'pending',
                    is_sales_run: false, // This is a production return, not a sales run
                    notes: `Return from production batch ${data.batchId}`
                });
            }

            // 3. Create a waste log for any wasted items
            if (data.wasted > 0) {
                const wasteLogRef = doc(collection(db, 'waste_logs'));
                transaction.set(wasteLogRef, {
                    productId: data.productId,
                    productName: data.productName,
                    productCategory: 'Breads', // Assuming this for now
                    quantity: data.wasted,
                    reason: 'Burnt', // Default reason for production waste
                    notes: `From production batch ${data.batchId}`,
                    staffId: user.staff_id,
                    staffName: user.name,
                    date: serverTimestamp()
                });
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Error completing production batch:", error);
        return { success: false, error: "Failed to complete production batch." };
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
          data.items.map(async (item: any) => {
            const productDoc = await getDoc(doc(db, 'products', item.productId));
            const price = productDoc.exists() ? productDoc.data().price : 0;
            totalRevenue += price * item.quantity;
            return { ...item, price };
          })
        );
        
        return {
            id: runDoc.id,
            ...data,
            date: (data.date as Timestamp).toDate().toISOString(),
            items: itemsWithPrices,
            totalRevenue,
            totalCollected: data.totalCollected || 0,
            totalOutstanding: totalRevenue - (data.totalCollected || 0),
        } as SalesRun;

    } catch (error) {
        console.error("Error fetching sales run details:", error);
        return null;
    }
}


export async function checkForMissingIndexes(): Promise<{ requiredIndexes: string[] }> {
    const checks = [
        () => getDocs(query(collection(db, 'transfers'), where('is_sales_run', '==', true), orderBy('date', 'desc'))),
        () => getDocs(query(collection(db, 'transfers'), where('to_staff_id', '==', 'test'), where('is_sales_run', '==', true), orderBy('date', 'desc'))),
        () => getDocs(query(collection(db, 'waste_logs'), where('staffId', '==', 'test'), orderBy('date', 'desc'))),
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
      
      salesByCustomer[customerId].totalSold += order.total;
      if (order.paymentMethod === 'Cash' || order.paymentMethod === 'Card') {
        salesByCustomer[customerId].totalPaid += order.total;
      }
    });

    return Object.values(salesByCustomer);
  } catch (error) {
    console.error("Error fetching customers for run:", error);
    return [];
  }
}

type SaleData = {
    runId: string;
    items: { productId: string; quantity: number; price: number, name: string }[];
    customerId: string;
    customerName: string;
    paymentMethod: 'Cash' | 'Credit' | 'Card';
    staffId: string;
    total: number;
}

export async function handleSellToCustomer(data: SaleData): Promise<{ success: boolean; error?: string }> {
  try {
    
    // If cash, create a confirmation request instead of an order
    if (data.paymentMethod === 'Cash') {
      const confirmationRef = doc(collection(db, 'payment_confirmations'));
      await setDoc(confirmationRef, {
        runId: data.runId,
        customerId: data.customerId,
        customerName: data.customerName,
        items: data.items,
        amount: data.total,
        driverId: data.staffId,
        driverName: (await getDoc(doc(db, 'staff', data.staffId))).data()?.name || 'Unknown',
        date: serverTimestamp(),
        status: 'pending'
      });
      return { success: true };
    }

    // For Card and Credit, create the order directly
    const orderData = {
      salesRunId: data.runId,
      customerId: data.customerId,
      customerName: data.customerName,
      items: data.items,
      total: data.total,
      paymentMethod: data.paymentMethod,
      date: new Date().toISOString(),
      staffId: data.staffId,
      status: 'Completed',
    };

    await runTransaction(db, async (transaction) => {
      const runRef = doc(db, 'transfers', data.runId);
      const newOrderRef = doc(collection(db, 'orders'));

      // Decrement stock from the driver's personal inventory
      for (const item of data.items) {
        const stockRef = doc(db, 'staff', data.staffId, 'personal_stock', item.productId);
        const stockDoc = await transaction.get(stockRef);
        if (!stockDoc.exists() || stockDoc.data().stock < item.quantity) {
          throw new Error(`Not enough stock for ${item.name}.`);
        }
        transaction.update(stockRef, { stock: increment(-item.quantity) });
      }

      // Create the order document
      transaction.set(newOrderRef, orderData);

      // Update the sales run financials
      if (data.paymentMethod === 'Card') {
        transaction.update(runRef, { totalCollected: increment(data.total) });
      }
      
      // Update the customer's overall balance if it's a credit sale
      if (data.paymentMethod === 'Credit' && data.customerId !== 'walk-in') {
        const customerRef = doc(db, 'customers', data.customerId);
        transaction.update(customerRef, { amountOwed: increment(data.total) });
      }
    });

    return { success: true };

  } catch (error) {
    console.error("Error selling to customer:", error);
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
        });
        return { success: true };
    } catch (error) {
        console.error("Error recording cash payment:", error);
        return { success: false, error: "Failed to submit cash payment for approval." };
    }
}
    

    




    








