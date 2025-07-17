
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
      { id: "prod_1", name: "Family Loaf", price: 550.00, stock: 50, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf' },
      { id: "prod_2", name: "Burger Loaf", price: 450.00, stock: 30, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun' },
      { id: "prod_3", name: "Jumbo Loaf", price: 900.00, stock: 25, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread' },
      { id: "prod_4", name: "Round Loaf", price: 500.00, stock: 40, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread' },
      // Drinks
      { id: "prod_5", name: "Coca-Cola (50cl)", price: 300.00, stock: 100, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola' },
      { id: "prod_6", name: "Bottled Water (75cl)", price: 200.00, stock: 150, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water' },
      { id: "prod_7", name: "Pepsi (50cl)", price: 300.00, stock: 90, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'pepsi can' },
      { id: "prod_8", name: "Sprite (50cl)", price: 300.00, stock: 0, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'sprite can' },
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
  ],
  promotions: [
    { id: "promo_1", name: "Weekend Special", description: "10% off all bread items", type: "percentage", value: 10, code: "WEEKEND10", startDate: "2024-01-01", endDate: "2024-12-31", status: "Active" },
    { id: "promo_2", name: "Free Drink", description: "Buy any 2 loaves, get a free drink", type: "free_item", value: null, code: "DRINKUP", startDate: "2024-05-01", endDate: "2024-05-31", status: "Expired" },
    { id: "promo_3", name: "Jumbo Discount", description: "₦100 off Jumbo Loaf", type: "fixed_amount", value: 100, code: "JUMBO100", startDate: "2024-06-01", endDate: "2024-06-30", status: "Active" },
    { id: "promo_4", name: "New Customer", description: "15% off first order", type: "percentage", value: 15, code: "NEW15", startDate: "2024-07-01", endDate: "2024-07-31", status: "Scheduled" }
  ],
  suppliers: [
    { id: "sup_1", name: "Flour Mills of Nigeria", contactPerson: "Mr. Adebayo", phone: "08012345678", email: "sales@fmnplc.com", address: "Apapa, Lagos", amountOwed: 500000, amountPaid: 450000 },
    { id: "sup_2", name: "Dangote Sugar", contactPerson: "Hajiya Bello", phone: "08087654321", email: "sugar@dangote.com", address: "Ikeja, Lagos", amountOwed: 250000, amountPaid: 250000 },
    { id: "sup_3", name: "Local Yeast Supplier", contactPerson: "Mama Chichi", phone: "07011223344", email: "chichisyeast@email.com", address: "Uyo Main Market", amountOwed: 50000, amountPaid: 20000 },
  ],
  recipes: [
     { id: "rec_1", name: "Standard Family Loaf", description: "The recipe for our signature family loaf.", ingredients: [
        { productId: "prod_1", productName: "Flour", quantity: 500, unit: "g" },
        { productId: "prod_2", productName: "Yeast", quantity: 10, unit: "g" },
        { productId: "prod_3", productName: "Sugar", quantity: 20, unit: "g" },
        { productId: "prod_4", productName: "Salt", quantity: 5, unit: "g" },
        { productId: "prod_6", productName: "Water", quantity: 300, unit: "ml" },
     ] }
  ]
};

export async function seedDatabase(): Promise<ActionResult> {
  console.log("Attempting to seed database...");
  try {
    const batch = writeBatch(db);
    
    // Seed Products
    seedData.products.forEach((product) => {
      const docRef = doc(db, "products", product.id);
      batch.set(docRef, product);
    });
    
    // Seed Staff
    seedData.staff.forEach((staffMember) => {
      const docRef = doc(db, "staff", staffMember.staff_id);
      batch.set(docRef, staffMember);
    });

    // Seed Promotions
    seedData.promotions.forEach((promotion) => {
        const docRef = doc(db, "promotions", promotion.id);
        batch.set(docRef, promotion);
    });
    
    // Seed Suppliers
    seedData.suppliers.forEach((supplier) => {
      const docRef = doc(db, "suppliers", supplier.id);
      batch.set(docRef, supplier);
    });

    // Seed Recipes
    seedData.recipes.forEach((recipe) => {
      const docRef = doc(db, "recipes", recipe.id);
      batch.set(docRef, recipe);
    });

    // We will create an empty "orders" collection so it exists, but not seed any orders.
    // This is a placeholder for where completed orders will go.
    const emptyOrderRef = doc(collection(db, "orders"));
    batch.set(emptyOrderRef, { placeholder: true });
    batch.delete(emptyOrderRef); // Delete it right away, just to ensure the collection path is created if it doesn't exist.

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
    const collectionsToClear = ['products', 'staff', 'promotions', 'orders', 'suppliers', 'recipes'];
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
