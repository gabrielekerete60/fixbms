
"use server";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type LoginResult = {
  success: boolean;
  error?: string;
  user?: {
    name: string;
    role: string;
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
    
    // Note: This is an insecure way to handle passwords. 
    // In a real application, you should use a secure authentication system like Firebase Auth
    // and store hashed passwords, not plain text.
    if (userData.password !== password) {
      return { success: false, error: "Invalid Staff ID or password." };
    }
    
    if (!userData.is_active) {
        return { success: false, error: "Invalid Staff ID or password." };
    }

    // In a real app, you would create a session here (e.g., using cookies or JWTs)
    // For this prototype, we'll just return success.

    return { 
      success: true,
      user: {
        name: userData.name,
        role: userData.role
      } 
    };
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: errorMessage };
  }
}
