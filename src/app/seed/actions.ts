
"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";

// Helper to create timestamps for recent days
const daysAgo = (days: number): Timestamp => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return Timestamp.fromDate(date);
};

const generateRandomDate = (startDaysAgo: number, endDaysAgo: number): Timestamp => {
    const randomDays = Math.floor(Math.random() * (startDaysAgo - endDaysAgo + 1)) + endDaysAgo;
    return daysAgo(randomDays);
};

const generateFinancialData = (numMonths: number) => {
    const sales = [];
    const directCosts = [];
    const indirectCosts = [];

    for (let i = 0; i < numMonths * 30; i++) { // Approx 1 entry per day
        const date = daysAgo(i);
        
        // Sales
        if (Math.random() > 0.1) { // 90% chance of sales on a day
            const cash = Math.floor(Math.random() * 50000) + 5000;
            const transfer = Math.floor(Math.random() * 30000) + 2000;
            const pos = Math.floor(Math.random() * 10000) + 1000;
            const creditSales = Math.random() > 0.8 ? Math.floor(Math.random() * 20000) : 0;
            const total = cash + transfer + pos + creditSales;
            sales.push({ date, description: "Daily Sale", cash, transfer, pos, creditSales, shortage: 0, total });
        }

        // Direct Costs
        if (Math.random() > 0.5) {
            const categories = ["Flour", "Sugar", "Butter", "Yeast", "Milk", "Egg", "Preservative"];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const quantity = Math.floor(Math.random() * 10) + 1;
            const total = (Math.floor(Math.random() * 5000) + 500) * quantity;
            directCosts.push({ date, description: `Purchase of ${category}`, category, quantity, total });
        }

        // Indirect Costs
        if (Math.random() > 0.3) {
             const categories = ["Diesel", "Petrol", "Nylon", "Repair", "General Expenses", "Cleaning", "Transportation", "Utilities"];
             const category = categories[Math.floor(Math.random() * categories.length)];
             const amount = Math.floor(Math.random() * 40000) + 2000;
             indirectCosts.push({ date, description: `Expense for ${category}`, category, amount });
        }
    }
    return { sales, directCosts, indirectCosts };
};

const twoYearsOfFinancials = generateFinancialData(24);

const products = [
    { id: "prod_1", name: "Family Loaf", price: 550.00, stock: 500, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf', costPrice: 300 },
    { id: "prod_2", name: "Burger Loaf", price: 450.00, stock: 300, category: 'Breads', unit: 'pack', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun', costPrice: 250 },
    { id: "prod_3", name: "Jumbo Loaf", price: 900.00, stock: 250, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread', costPrice: 500 },
    { id: "prod_4", name: "Round Loaf", price: 500.00, stock: 400, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread', costPrice: 280 },
    { id: "prod_5", name: "Croissant", price: 400.00, stock: 600, category: 'Pastries', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'croissant pastry', costPrice: 220 },
    { id: "prod_6", name: "Meat Pie", price: 600.00, stock: 450, category: 'Pastries', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'meat pie', costPrice: 350 },
    { id: "prod_7", name: "Coca-Cola (50cl)", price: 300.00, stock: 1000, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola', costPrice: 200 },
    { id: "prod_8", name: "Bottled Water (75cl)", price: 150.00, stock: 1500, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water', costPrice: 100 },
    { id: "prod_9", name: "Fanta (50cl)", price: 300.00, stock: 800, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'fanta drink', costPrice: 200 },
    { id: "prod_10", name: "Freshyo", price: 700.00, stock: 600, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'yogurt drink', costPrice: 550 },
];

const staff = [
    { staff_id: '100001', name: 'Wisdom Effiong Edet', email: 'wisdom.edet@example.com', password: 'ManagerPass1!', role: 'Manager', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "MONIPOINT", account_number: "9031612444", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '200002', name: 'Mr Bassey Smith Daniel', email: 'bassey.daniel@example.com', password: 'AccountantPass1!', role: 'Accountant', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Opay", account_number: "8136164826", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300003', name: 'MR Bassey OFFIONG', email: 'bassey.offiong@example.com', password: 'BakerPass1!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 60000, bank_name: "Opay", account_number: "8066706293", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400004', name: 'Mr Ukeme Akpan Thompson', email: 'ukeme.thompson@example.com', password: 'StaffPass1!', role: 'Showroom Staff', is_active: true, pay_type: 'Salary', pay_rate: 100000, bank_name: "First Bank", account_number: "3080708781", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '500005', name: 'Victory Peter Ekerete', email: 'victory.ekerete@example.com', password: 'StorekeeperPass1!', role: 'Storekeeper', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "PALMPAY", account_number: "9126459437", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600006', name: 'Mary Felix Ating', email: 'mary.ating@example.com', password: 'StaffPass2!', role: 'Showroom Staff', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "OPAY", account_number: "8071929362", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '700007', name: 'Ubom Robert Okon', email: 'ubom.okon@example.com', password: 'BakerPass3!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 35000, bank_name: "MONIPOINT", account_number: "7046450879", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '800008', name: 'Nnamso George Walter', email: 'nnamso.walter@example.com', password: 'CleanerPass1!', role: 'Cleaner', is_active: false, pay_type: 'Salary', pay_rate: 30000, bank_name: "Unity Bank", account_number: "0059218669", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '900009', name: 'Zion Ekerete', email: 'zion.ekerete@example.com', password: 'BakerPass4!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "OPAY", account_number: "7041091374", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '100010', name: 'Edet Edet Nyong', email: 'edet.nyong@example.com', password: 'DriverPass1!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "Access Bank", account_number: "0736691040", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '110011', name: 'Benog Security Services', email: 'benog.security@example.com', password: 'SecurityPass1!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 20000, bank_name: "U.B.A", account_number: "2288605641", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '120012', name: 'Nsikak Udo Essiet', email: 'nsikak.essiet@example.com', password: 'SecurityPass2!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "U.B.A", account_number: "2304484777", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '130013', name: 'Aniefon Udo Bassey', email: 'aniefon.bassey@example.com', password: 'SecurityPass3!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "First Bank", account_number: "3090572411", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '000000', name: 'Gabriel Developer', email: 'gabriel.dev@example.com', password: 'DevPassword1!', role: 'Developer', is_active: true, pay_type: 'Salary', pay_rate: 500000, bank_name: "Kuda Bank", account_number: "8901234567", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
];

const recipes = [
    {
       id: "rec_1",
       name: "Standard Family Loaf",
       description: "The recipe for our signature family loaf.",
       productId: "prod_1",
       productName: "Family Loaf",
       ingredients: [
           { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 0.5, unit: "kg" },
           { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.01, unit: "kg" },
           { ingredientId: "ing_2", ingredientName: "Granulated Sugar", quantity: 0.02, unit: "kg" },
           { ingredientId: "ing_7", ingredientName: "Salt", quantity: 0.005, unit: "kg" },
       ]
    },
    {
       id: "rec_2",
       name: "Classic Croissant",
       description: "A buttery, flaky croissant.",
       productId: "prod_5",
       productName: "Croissant",
       ingredients: [
           { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 0.25, unit: "kg" },
           { ingredientId: "ing_3", ingredientName: "Unsalted Butter", quantity: 0.15, unit: "kg" },
           { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.007, unit: "kg" },
       ]
    },
];

const seedData = {
  products,
  staff,
  promotions: [
    { id: "promo_1", name: "Weekend Special", description: "10% off all bread items", type: "percentage", value: 10, code: "WEEKEND10", startDate: daysAgo(7).toDate().toISOString(), endDate: daysAgo(-7).toDate().toISOString(), applicableProducts: [], usageLimit: 100, timesUsed: 12 },
    { id: "promo_2", name: "Holiday Bonanza", description: "N500 off total purchase", type: "fixed_amount", value: 500, code: "HOLIDAY500", startDate: daysAgo(30).toDate().toISOString(), endDate: daysAgo(20).toDate().toISOString(), applicableProducts: [], usageLimit: 50, timesUsed: 45 },
    { id: "promo_3", name: "Expired Promo", description: "Old promo", type: "percentage", value: 15, code: "OLDPROMO", startDate: daysAgo(90).toDate().toISOString(), endDate: daysAgo(80).toDate().toISOString(), applicableProducts: [], usageLimit: 200, timesUsed: 150 },
  ],
  suppliers: [
    { id: "sup_1", name: "Flour Mills of Nigeria", contactPerson: "Mr. Adebayo", phone: "08012345678", email: "sales@fmnplc.com", address: "Apapa, Lagos", amountOwed: 500000, amountPaid: 450000 },
    { id: "sup_2", name: "Dangote Sugar", contactPerson: "Hajiya Bello", phone: "08087654321", email: "sugar@dangote.com", address: "Ikeja, Lagos", amountOwed: 250000, amountPaid: 250000 },
    { id: "sup_3", name: "Local Yeast Supplier", contactPerson: "Mama Chichi", phone: "07011223344", email: "chichisyeast@email.com", address: "Uyo Main Market", amountOwed: 50000, amountPaid: 20000 },
  ],
  recipes,
  ingredients: [
    { id: "ing_1", name: "All-Purpose Flour", stock: 100.00, unit: 'kg', costPerUnit: 500.00, expiryDate: null },
    { id: "ing_2", name: "Granulated Sugar", stock: 50.00, unit: 'kg', costPerUnit: 800.00, expiryDate: null },
    { id: "ing_3", name: "Unsalted Butter", stock: 20.00, unit: 'kg', costPerUnit: 6000.00, expiryDate: null },
    { id: "ing_4", name: "Large Eggs", stock: 200.00, unit: 'pcs', costPerUnit: 50.00, expiryDate: null },
    { id: "ing_5", name: "Whole Milk", stock: 30.00, unit: 'L', costPerUnit: 900.00, expiryDate: null },
    { id: "ing_6", name: "Yeast", stock: 10.00, unit: 'kg', costPerUnit: 2500.00, expiryDate: null },
    { id: "ing_7", name: "Salt", stock: 10.00, unit: 'kg', costPerUnit: 200.00, expiryDate: null },
  ],
  other_supplies: [
    { id: "sup_os_1", name: "Bread Wrappers", stock: 1000, unit: 'pcs', costPerUnit: 10.00, category: "Packaging" },
    { id: "sup_os_2", name: "Shopping Bags", stock: 500, unit: 'pcs', costPerUnit: 20.00, category: "Packaging" },
  ],
  customers: Array.from({ length: 50 }, (_, i) => ({
    id: `cust_${i + 1}`,
    name: `Customer ${i + 1}`,
    phone: `080${10000000 + i}`,
    email: `customer${i + 1}@example.com`,
    address: `${i + 1} Main St, City`,
    joinedDate: daysAgo(Math.floor(Math.random() * 730)),
    totalSpent: Math.floor(Math.random() * 200000),
    amountOwed: Math.random() > 0.7 ? Math.floor(Math.random() * 10000) : 0,
    amountPaid: Math.floor(Math.random() * 50000),
  })),
  orders: Array.from({ length: 1500 }, (_, i) => {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      return {
        id: `ord_${i + 1}`,
        items: [{ productId: product.id, name: product.name, price: product.price, quantity, costPrice: product.costPrice }],
        total: product.price * quantity,
        date: generateRandomDate(0, 730),
        paymentMethod: Math.random() > 0.5 ? 'Card' : 'Cash',
        customerName: `Customer ${Math.floor(Math.random() * 50) + 1}`,
        customerId: `cust_${Math.floor(Math.random() * 50) + 1}`,
        status: 'Completed',
        staffId: '400004'
      }
  }),
  transfers: Array.from({ length: 200 }, (_, i) => ({
      id: `trans_${i + 1}`,
      from_staff_id: "500005", // Storekeeper
      from_staff_name: "Victory Peter Ekerete",
      to_staff_id: i % 2 === 0 ? "400004" : "100010", // Showroom or Delivery
      to_staff_name: i % 2 === 0 ? "Mr Ukeme Akpan Thompson" : "Edet Edet Nyong",
      items: [{ productId: `prod_${(i % 10) + 1}`, productName: products[i % 10].name, quantity: Math.floor(Math.random() * 20) + 10 }],
      date: generateRandomDate(0, 730),
      status: Math.random() > 0.1 ? 'completed' : 'pending',
      is_sales_run: i % 2 !== 0,
      totalCollected: 0
  })),
  production_batches: Array.from({ length: 100 }, (_, i) => ({
      id: `batch_${i + 1}`,
      recipeId: `rec_${(i % 2) + 1}`,
      recipeName: recipes[i % 2].name,
      productId: recipes[i % 2].productId,
      productName: recipes[i % 2].productName,
      requestedById: '300003',
      requestedByName: 'MR Bassey OFFIONG',
      quantityToProduce: Math.floor(Math.random() * 50) + 20,
      status: i < 5 ? 'pending_approval' : (i < 15 ? 'in_production' : 'completed'),
      createdAt: generateRandomDate(0, 730),
      approvedAt: generateRandomDate(0, 730),
      successfullyProduced: Math.floor(Math.random() * 45) + 15,
      wasted: Math.floor(Math.random() * 5),
      ingredients: recipes[i % 2].ingredients
  })),
  waste_logs: Array.from({ length: 300 }, (_, i) => ({
    id: `waste_${i + 1}`,
    productId: `prod_${(i % 10) + 1}`,
    productName: products[i % 10].name,
    productCategory: products[i % 10].category,
    quantity: Math.floor(Math.random() * 5) + 1,
    reason: ['Spoiled', 'Damaged', 'Burnt', 'Error'][i % 4],
    notes: 'Generated seed data',
    date: generateRandomDate(0, 730),
    staffId: `400004`,
    staffName: `Mr Ukeme Akpan Thompson`
  })),
  attendance: staff.flatMap(s => 
      Array.from({ length: 450 }, (_, i) => {
          if (Math.random() < 0.2) return null; // 20% absenteeism
          const clockIn = daysAgo(i);
          clockIn.toDate().setHours(8 + Math.floor(Math.random()*2), Math.floor(Math.random()*60));
          const clockOut = Timestamp.fromMillis(clockIn.toMillis() + ( (8 + Math.random()) * 60 * 60 * 1000));
          return {
              id: `att_${s.staff_id}_${i}`,
              staff_id: s.staff_id,
              clock_in_time: clockIn,
              clock_out_time: clockOut,
              date: clockIn.toDate().toISOString().split('T')[0]
          }
      }).filter(Boolean)
  ),
  sales: twoYearsOfFinancials.sales,
  debt: [
    { id: 'loan_1', date: daysAgo(500), description: "Bal b/f Loan", debit: 100000, credit: null },
    { id: 'loan_2', date: daysAgo(200), description: "Loan for Raw Material", debit: 363000, credit: null },
    { id: 'loan_3', date: daysAgo(50), description: "Loan repayment", debit: null, credit: 50000 },
  ],
  directCosts: twoYearsOfFinancials.directCosts,
  indirectCosts: twoYearsOfFinancials.indirectCosts,
  wages: staff.flatMap(s => 
      Array.from({length: 24}, (_, i) => {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const deductions = { shortages: 0, advanceSalary: Math.random() > 0.8 ? 5000 : 0, debt: 0, fine: 0 };
          return {
              id: `wage_${s.staff_id}_${i}`,
              name: s.name,
              department: s.role,
              position: s.role,
              salary: s.pay_rate,
              deductions,
              netPay: s.pay_rate - deductions.advanceSalary,
              date: Timestamp.fromDate(monthDate)
          }
      })
  ),
  closingStocks: [
    { id: 'cs_1', item: 'Flour', remainingStock: '100KG', amount: 108000 },
    { id: 'cs_2', item: 'Yeast', remainingStock: '9 Pack', amount: 27000 },
    { id: 'cs_3', item: 'Zeast', remainingStock: '3 Bottle 890g', amount: 105030 },
    { id: 'cs_4', item: 'Egg', remainingStock: '75 Pices', amount: 13230 },
    { id: 'cs_5', item: 'Salt', remainingStock: '1 Bag 16,4kg', amount: 22576 },
    { id: 'cs_6', item: 'Strawbery', remainingStock: '1 Bottle', amount: 5000 },
    { id: 'cs_7', item: 'Oil', remainingStock: '13.53CL', amount: 37030 },
    { id: 'cs_8', item: 'Sagar', remainingStock: '2 Bags 9.85kg', amount: 174661 },
    { id: 'cs_9', item: 'Preservative', remainingStock: '5 Pack 810g', amount: 23240 },
    { id: 'cs_10', item: 'Butter', remainingStock: '2 Carton ,10kg', amount: 104000 },
    { id: 'cs_11', item: 'Tin milk', remainingStock: '6 Tin', amount: 6000 },
    { id: 'cs_12', item: 'Butter Scotch', remainingStock: '440g', amount: 4400 },
  ],
  discount_records: [
      { id: 'dr_1', bread_type: 'Round Loaf', amount: 58000 },
      { id: 'dr_2', bread_type: 'Family Loaf', amount: 1200 },
      { id: 'dr_3', bread_type: 'Short Loaf', amount: 4700 },
      { id: 'dr_4', bread_type: 'Burger', amount: 1000 },
      { id: 'dr_5', bread_type: 'Jumbo', amount: 300 },
      { id: 'dr_6', bread_type: 'Mini Bite', amount: 550 },
      { id: 'dr_7', bread_type: 'Big Bite', amount: 600 },
  ]
};

export async function verifySeedPassword(password: string): Promise<ActionResult> {
  const seedPassword = process.env.SEED_PASSWORD;

  if (!seedPassword) {
    // If no password is set in the environment, deny access for security.
    return { success: false, error: "Seed password is not configured on the server." };
  }
  
  if (password === seedPassword) {
    return { success: true };
  } else {
    return { success: false, error: "Invalid password." };
  }
}

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
                
                const itemWithTimestamps = { ...item };
                for (const key of Object.keys(itemWithTimestamps)) {
                    if ( (key.toLowerCase().includes('date') || key.toLowerCase().includes('timestamp') || key.toLowerCase().includes('at')) && (itemWithTimestamps[key] instanceof Date) && itemWithTimestamps[key]) {
                        itemWithTimestamps[key] = Timestamp.fromDate(itemWithTimestamps[key]);
                    } else if (itemWithTimestamps[key] instanceof Timestamp) {
                        // It's already a timestamp, do nothing.
                    }
                }

                batch.set(docRef, itemWithTimestamps);
            });
        }
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

async function clearSubcollections(collectionPath: string, batch: writeBatch) {
    const mainCollectionSnapshot = await getDocs(collection(db, collectionPath));
    for (const mainDoc of mainCollectionSnapshot.docs) {
        if (collectionPath === 'staff') {
            const subCollectionRef = collection(db, mainDoc.ref.path, 'personal_stock');
            const subCollectionSnapshot = await getDocs(subCollectionRef);
            subCollectionSnapshot.forEach(subDoc => {
                batch.delete(subDoc.ref);
            });
        }
    }
}

export async function clearDatabase(): Promise<ActionResult> {
  console.log("Attempting to clear database...");
  try {
    const collectionsToClear = Object.keys(seedData);

    for (const collectionName of collectionsToClear) {
      const batch = writeBatch(db);

      if (collectionName === 'staff') {
        await clearSubcollections('staff', batch);
      }

      const querySnapshot = await getDocs(collection(db, collectionName));
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Cleared collection: ${collectionName}`);
    }

    console.log("Database cleared successfully.");
    return { success: true };
  } catch (error)
 {
    console.error("Error clearing database:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to clear database: ${errorMessage}` };
  }
}

export async function seedEmptyData(): Promise<ActionResult> {
  console.log("Attempting to seed empty data with users...");
  try {
    // First, clear the entire database to ensure a fresh start
    await clearDatabase();
    
    // Then, create a batch to seed only the staff
    const batch = writeBatch(db);
    
    // Create all collections by adding and deleting a placeholder, except for staff
    const allCollections = Object.keys(seedData);
    for (const collectionName of allCollections) {
        if (collectionName !== 'staff') {
            const placeholderRef = doc(collection(db, collectionName), '__placeholder__');
            batch.set(placeholderRef, { exists: true });
            batch.delete(placeholderRef);
        }
    }

    // Now, seed the staff data
    seedData.staff.forEach((staffMember) => {
      const docRef = doc(db, "staff", staffMember.staff_id);
      batch.set(docRef, staffMember);
    });

    await batch.commit();

    console.log("Database seeded with only staff successfully.");
    return { success: true };
  } catch (error) {
    console.error("Error seeding empty data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to seed empty data: ${errorMessage}` };
  }
}

type ActionResult = {
  success: boolean;
  error?: string;
};
