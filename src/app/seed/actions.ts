"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

type ActionResult = {
  success: boolean;
  error?: string;
};

// Placeholder for seed data
const seedData = {
  products: [
    { id: "prod_1", name: "Classic Sourdough", price: 8.50 },
    { id: "prod_2", name: "Croissant", price: 4.00 },
    { id: "prod_3", name: "Baguette", price: 5.00 },
  ],
  staff: [
    { id: "123456", name: "Jane Doe", role: "Baker" },
    { id: "654321", name: "John Smith", role: "Cashier" },
  ]
};


export async function seedDatabase(): Promise<ActionResult> {
  console.log("Attempting to seed database...");
  try {
    const batch = writeBatch(db);
    
    seedData.products.forEach((product) => {
      const docRef = doc(db, "products", product.id);
      batch.set(docRef, product);
    });
    
    seedData.staff.forEach((staffMember) => {
      const docRef = doc(db, "staff", staffMember.id);
      batch.set(docRef, staffMember);
    });
    
    await batch.commit();

    console.log("Database seeded successfully.");
    return { success: true };
  } catch (error) {
    console.error("Error seeding database:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to seed database: ${errorMessage}` };
  }
}

export async function clearDatabase(): Promise<ActionResult> {
  console.log("Attempting to clear database...");
  try {
    const collectionsToClear = ['products', 'staff'];
    const batch = writeBatch(db);

    for (const collectionName of collectionsToClear) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }
    await batch.commit();
    
    console.log("Database cleared successfully.");
    return { success: true };
  } catch (error)
 {
    console.error("Error clearing database:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to clear database: ${errorMessage}` };
  }
}
