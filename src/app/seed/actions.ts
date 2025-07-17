
"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

type ActionResult = {
  success: boolean;
  error?: string;
};

const seedData = {
  products: [
      // Breads
      { id: "prod_1", name: "Family Loaf", price: 550.00, stock: 50, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf', costPrice: 300 },
      { id: "prod_2", name: "Burger Loaf", price: 450.00, stock: 30, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun', costPrice: 250 },
      { id: "prod_3", name: "Jumbo Loaf", price: 900.00, stock: 25, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread', costPrice: 500 },
      { id: "prod_4", name: "Round Loaf", price: 500.00, stock: 40, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread', costPrice: 280 },
      // Drinks
      { id: "prod_5", name: "Coca-Cola (50cl)", price: 300.00, stock: 100, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola', costPrice: 200 },
      { id: "prod_6", name: "Bottled Water (75cl)", price: 200.00, stock: 150, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water', costPrice: 100 },
      { id: "prod_7", name: "Pepsi (50cl)", price: 300.00, stock: 90, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'pepsi can', costPrice: 200 },
      { id: "prod_8", name: "Sprite (50cl)", price: 300.00, stock: 0, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'sprite can', costPrice: 200 },
  ],
  staff: [
    { staff_id: '000000', name: 'Gabriel Developer', email: 'gabriel.dev@example.com', password: 'DevPassword1!', role: 'Developer', is_active: true, salary: 500000},
    { staff_id: '100001', name: 'Chris Manager', email: 'chris.manager@example.com', password: 'ManagerPass1!', role: 'Manager', is_active: true, salary: 350000},
    { staff_id: '200002', name: 'Vic Supervisor', email: 'vic.supervisor@example.com', password: 'SupervisorPass1!', role: 'Supervisor', is_active: true, salary: 250000},
    { staff_id: '300003', name: 'Favour Accountant', email: 'favour.accountant@example.com', password: '', role: 'Accountant', is_active: true, salary: 200000},
    { staff_id: '400004', name: 'Mfon Staff', email: 'mfon.staff@example.com', password: 'StaffPass1!', role: 'Showroom Staff', is_active: true, salary: 80000},
    { staff_id: '400005', name: 'Akan Staff', email: 'akan.staff@example.com', password: 'StaffPass1!', role: 'Delivery Staff', is_active: true, salary: 80000},
    { staff_id: '500006', name: 'Blessing Baker', email: 'blessing.baker@example.com', password: 'BakerPass1!', role: 'Baker', is_active: true, salary: 150000},
    { staff_id: '600007', name: 'John Cleaner', email: 'john.cleaner@example.com', password: 'CleanerPass1!', role: 'Cleaner', is_active: true, salary: 60000},
    { staff_id: '700008', name: 'David Storekeeper', email: 'david.storekeeper@example.com', password: 'StorekeeperPass1!', role: 'Storekeeper', is_active: true, salary: 100000},
  ],
  promotions: [
    { id: "promo_1", name: "Weekend Special", description: "10% off all bread items", type: "percentage", value: 10, code: "WEEKEND10", startDate: "2024-01-01", endDate: "2024-12-31", applicableProducts: [] },
    { id: "promo_2", name: "Free Drink", description: "Buy any 2 loaves, get a free drink", type: "free_item", value: null, code: "DRINKUP", startDate: "2024-05-01", endDate: "2024-05-31", applicableProducts: [] },
    { id: "promo_3", name: "Jumbo Discount", description: "₦100 off Jumbo Loaf", type: "fixed_amount", value: 100, code: "JUMBO100", startDate: "2024-06-01", endDate: "2024-06-30", applicableProducts: [{ value: 'prod_3', label: 'Jumbo Loaf' }] },
    { id: "promo_4", name: "New Customer", description: "15% off first order", type: "percentage", value: 15, code: "NEW15", startDate: "2024-07-01", endDate: "2024-07-31", applicableProducts: [] }
  ],
  suppliers: [
    { id: "sup_1", name: "Flour Mills of Nigeria", contactPerson: "Mr. Adebayo", phone: "08012345678", email: "sales@fmnplc.com", address: "Apapa, Lagos", amountOwed: 500000, amountPaid: 450000 },
    { id: "sup_2", name: "Dangote Sugar", contactPerson: "Hajiya Bello", phone: "08087654321", email: "sugar@dangote.com", address: "Ikeja, Lagos", amountOwed: 250000, amountPaid: 250000 },
    { id: "sup_3", name: "Local Yeast Supplier", contactPerson: "Mama Chichi", phone: "07011223344", email: "chichisyeast@email.com", address: "Uyo Main Market", amountOwed: 50000, amountPaid: 20000 },
  ],
  recipes: [
     { 
        id: "rec_1", 
        name: "Standard Family Loaf", 
        description: "The recipe for our signature family loaf.",
        productId: "prod_1",
        productName: "Family Loaf",
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 500, unit: "g" },
            { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 10, unit: "g" },
            { ingredientId: "ing_2", ingredientName: "Granulated Sugar", quantity: 20, unit: "g" },
            { ingredientId: "ing_7", ingredientName: "Salt", quantity: 5, unit: "g" },
        ]
     }
  ],
  ingredients: [
    { id: "ing_1", name: "All-Purpose Flour", stock: 50.00, unit: 'kg', costPerUnit: 500.00, expiryDate: null },
    { id: "ing_2", name: "Granulated Sugar", stock: 25.00, unit: 'kg', costPerUnit: 800.00, expiryDate: null },
    { id: "ing_3", name: "Unsalted Butter", stock: 20.00, unit: 'kg', costPerUnit: 6000.00, expiryDate: null },
    { id: "ing_4", name: "Large Eggs", stock: 200.00, unit: 'pcs', costPerUnit: 50.00, expiryDate: null },
    { id: "ing_5", name: "Whole Milk", stock: 30.00, unit: 'L', costPerUnit: 900.00, expiryDate: null },
    { id: "ing_6", name: "Yeast", stock: 5.00, unit: 'kg', costPerUnit: 2500.00, expiryDate: null },
    { id: "ing_7", name: "Salt", stock: 10.00, unit: 'kg', costPerUnit: 200.00, expiryDate: null },
    { id: "ing_8", name: "Vanilla Extract", stock: 2.00, unit: 'L', costPerUnit: 15000.00, expiryDate: null },
    { id: "ing_9", name: "Tin Milk", stock: 100.00, unit: 'cans', costPerUnit: 400.00, expiryDate: null },
    { id: "ing_10", name: "Lux Essence", stock: 1.00, unit: 'L', costPerUnit: 20000.00, expiryDate: null },
    { id: "ing_11", name: "Zeast Oil", stock: 10.00, unit: 'L', costPerUnit: 1200.00, expiryDate: null },
    { id: "ing_12", name: "Vegetable Oil", stock: 25.00, unit: 'L', costPerUnit: 1000.00, expiryDate: null },
    { id: "ing_13", name: "Preservative", stock: 1.00, unit: 'kg', costPerUnit: 5000.00, expiryDate: null },
    { id: "ing_14", name: "Butterscotch Flavor", stock: 0.50, unit: 'L', costPerUnit: 18000.00, expiryDate: null },
    { id: "ing_15", name: "Strawberry Flavor", stock: 0.50, unit: 'L', costPerUnit: 17000.00, expiryDate: null },
  ],
  other_supplies: [
    { id: "sup_os_1", name: "Milk for Bakers", stock: 50.00, unit: 'sachets', costPerUnit: 150.00, category: "Production" },
    { id: "sup_os_2", name: "Bread Wrappers", stock: 1000, unit: 'pcs', costPerUnit: 10.00, category: "Packaging" },
    { id: "sup_os_3", name: "Shopping Bags", stock: 500, unit: 'pcs', costPerUnit: 20.00, category: "Packaging" },
    { id: "sup_os_4", name: "Disinfectant", stock: 5, unit: 'L', costPerUnit: 5000.00, category: "Cleaning" },
  ],
  customers: [
      { id: 'cust_1', name: 'Adebisi Onyeka', phone: '08012345678', email: 'a.onyeka@example.com', address: '123, Allen Avenue, Ikeja', joinedDate: '2023-01-15T10:00:00Z', totalSpent: 150000 },
      { id: 'cust_2', name: 'Ngozi Okoro', phone: '09087654321', email: 'n.okoro@example.com', address: '45, Lekki Phase 1', joinedDate: '2023-02-20T11:30:00Z', totalSpent: 75000 },
      { id: 'cust_3', name: 'Chinedu Eze', phone: '07011223344', email: 'c.eze@example.com', address: '78, Surulere, Lagos', joinedDate: '2023-03-10T09:00:00Z', totalSpent: 250000 },
  ],
  supply_logs: [
    // Placeholder for future seeded logs if needed
  ]
};

export async function seedDatabase(): Promise<ActionResult> {
  console.log("Attempting to seed database...");
  try {
    const batch = writeBatch(db);
    
    for (const [collectionName, data] of Object.entries(seedData)) {
        if (Array.isArray(data)) {
            data.forEach((item) => {
                let docRef;
                if(item.id) {
                    docRef = doc(db, collectionName, item.id);
                } else if (item.staff_id) {
                     docRef = doc(db, collectionName, item.staff_id);
                } else {
                    docRef = doc(collection(db, collectionName));
                }
                batch.set(docRef, item);
            });
        }
    }

    // We will create empty collections so they exist, but not seed any orders.
    // This is a placeholder for where completed data will go.
    const collectionsToEnsure = ["orders"];
    for (const coll of collectionsToEnsure) {
        const emptyDocRef = doc(collection(db, coll));
        batch.set(emptyDocRef, { placeholder: true });
        batch.delete(emptyDocRef); // Delete it right away, just to ensure the collection path is created if it doesn't exist.
    }


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
    const collectionsToClear = Object.keys(seedData);
    collectionsToClear.push('orders');
    
    const batch = writeBatch(db);

    for (const collectionName of collectionsToClear) {
      // It's safe to try to clear a collection even if it doesn't exist.
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
