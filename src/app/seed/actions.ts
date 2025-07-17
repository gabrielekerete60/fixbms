
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
    { id: "ing_16", name: "Milk for Bakers", stock: 50.00, unit: 'sachets', costPerUnit: 150.00, expiryDate: null },
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

    // Seed Ingredients
    seedData.ingredients.forEach((ingredient) => {
        const docRef = doc(db, "ingredients", ingredient.id);
        batch.set(docRef, ingredient);
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
    const collectionsToClear = ['products', 'staff', 'promotions', 'orders', 'suppliers', 'recipes', 'ingredients'];
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
