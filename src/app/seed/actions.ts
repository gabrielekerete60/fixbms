"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

type ActionResult = {
  success: boolean;
  error?: string;
};

const seedData = {
  products: [
    { id: "prod_1", name: "Classic Sourdough", price: 8.50 },
    { id: "prod_2", name: "Croissant", price: 4.00 },
    { id: "prod_3", name: "Baguette", price: 5.00 },
  ],
  staff: [
    { staff_id: '000000', name: 'Gabriel Developer', password: 'DevPassword1!', role: 'developer', is_active: true, salary: 500000},
    { staff_id: '100001', name: 'Chris Manager', password: 'ManagerPass1!', role: 'manager', is_active: true, salary: 350000},
    { staff_id: '200002', name: 'Vic Supervisor', password: 'SupervisorPass1!', role: 'supervisor', is_active: true, salary: 250000},
    { staff_id: '300003', name: 'Favour Accountant', password: '', role: 'accountant', is_active: true, salary: 200000},
    { staff_id: '400004', name: 'Mfon Staff', password: 'StaffPass1!', role: 'showroom_staff', is_active: true, salary: 80000},
    { staff_id: '400005', name: 'Akan Staff', password: 'StaffPass1!', role: 'delivery_staff', is_active: true, salary: 80000},
    { staff_id: '500006', name: 'Blessing Baker', password: 'BakerPass1!', role: 'baker', is_active: true, salary: 150000},
    { staff_id: '600007', name: 'John Cleaner', password: 'CleanerPass1!', role: 'cleaner', is_active: true, salary: 60000},
    { staff_id: '700008', name: 'David Storekeeper', password: 'StorekeeperPass1!', role: 'storekeeper', is_active: true, salary: 100000},
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
      const docRef = doc(db, "staff", staffMember.staff_id);
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
