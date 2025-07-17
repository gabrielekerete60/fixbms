
"use server";

import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, addDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
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
        await addDoc(collection(db, "transfers"), {
            ...data,
            date: serverTimestamp(),
            status: 'pending'
        });
        return { success: true };
    } catch (error) {
        console.error("Transfer initiation error:", error);
        return { success: false, error: "Failed to initiate transfer." };
    }
}
