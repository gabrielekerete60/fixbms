
"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { format } from "date-fns";

// --- SEED DATA DEFINITIONS ---

const daysAgo = (days: number): Timestamp => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return Timestamp.fromDate(date);
};

const generateRandomDate = (startDaysAgo: number, endDaysAgo: number): Timestamp => {
    const randomDays = Math.floor(Math.random() * (startDaysAgo - endDaysAgo + 1)) + endDaysAgo;
    return daysAgo(randomDays);
};

const productsData = [
    { id: "prod_1", name: "Family Loaf", price: 550.00, stock: 500, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf', costPrice: 300, lowStockThreshold: 50 },
    { id: "prod_2", name: "Burger Loaf", price: 450.00, stock: 300, category: 'Breads', unit: 'pack', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun', costPrice: 250, lowStockThreshold: 50 },
    { id: "prod_3", name: "Jumbo Loaf", price: 900.00, stock: 250, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread', costPrice: 500, lowStockThreshold: 25 },
    { id: "prod_4", name: "Round Loaf", price: 500.00, stock: 400, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread', costPrice: 280, lowStockThreshold: 40 },
    { id: "prod_5", name: "Croissant", price: 400.00, stock: 600, category: 'Pastries', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'croissant pastry', costPrice: 220, lowStockThreshold: 60 },
    { id: "prod_6", name: "Meat Pie", price: 600.00, stock: 450, category: 'Pastries', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'meat pie', costPrice: 350, lowStockThreshold: 45 },
    { id: "prod_7", name: "Coca-Cola (50cl)", price: 300.00, stock: 1000, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola', costPrice: 200, lowStockThreshold: 100 },
    { id: "prod_8", name: "Bottled Water (75cl)", price: 150.00, stock: 1500, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water', costPrice: 100, lowStockThreshold: 150 },
    { id: "prod_9", name: "Fanta (50cl)", price: 300.00, stock: 800, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'fanta drink', costPrice: 200, lowStockThreshold: 80 },
    { id: "prod_10", name: "Freshyo", price: 700.00, stock: 600, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'yogurt drink', costPrice: 550, lowStockThreshold: 60 },
];

const staffData = [
    { staff_id: '100001', name: 'Wisdom Effiong Edet', email: 'wisdom.edet@example.com', password: 'ManagerPass1!', role: 'Manager', is_active: true, pay_type: 'Salary', pay_rate: 150000, bank_name: "MONIPOINT", account_number: "9031612444", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '100002', name: 'Angela Uwem', email: 'angela.uwem@example.com', password: 'SupervisorPass1!', role: 'Supervisor', is_active: true, pay_type: 'Salary', pay_rate: 100000, bank_name: "Access Bank", account_number: "0012345678", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '200001', name: 'Mr Bassey Smith Daniel', email: 'bassey.daniel@example.com', password: 'AccountantPass1!', role: 'Accountant', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Opay", account_number: "8136164826", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300001', name: 'MR Bassey OFFIONG', email: 'bassey.offiong@example.com', password: 'BakerPass1!', role: 'Chief Baker', is_active: true, pay_type: 'Salary', pay_rate: 75000, bank_name: "Opay", account_number: "8066706293", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300002', name: 'Ubom Robert Okon', email: 'ubom.okon@example.com', password: 'BakerPass3!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 35000, bank_name: "MONIPOINT", account_number: "7046450879", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300003', name: 'Zion Ekerete', email: 'zion.ekerete@example.com', password: 'BakerPass4!', role: 'Bakery Assistant', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "OPAY", account_number: "7041091374", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300004', name: 'Grace Effiong', email: 'grace.effiong@example.com', password: 'AssistantPass1!', role: 'Bakery Assistant', is_active: true, pay_type: 'Salary', pay_rate: 38000, bank_name: "GTB", account_number: "0123456789", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400001', name: 'Victory Peter Ekerete', email: 'victory.ekerete@example.com', password: 'StorekeeperPass1!', role: 'Storekeeper', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "PALMPAY", account_number: "9126459437", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '500002', name: 'Mary Felix Ating', email: 'mary.ating@example.com', password: 'StaffPass2!', role: 'Showroom Staff', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "OPAY", account_number: "8071929362", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600001', name: 'Edet Edet Nyong', email: 'edet.nyong@example.com', password: 'DriverPass1!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "Access Bank", account_number: "0736691040", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600002', name: 'Okon Bassey', email: 'okon.bassey@example.com', password: 'DriverPass2!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "GTBank", account_number: "1234567890", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600003', name: 'Imaobong Akpan', email: 'ima.akpan@example.com', password: 'DriverPass3!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "Zenith Bank", account_number: "0987654321", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600004', name: 'Elijah Daniel', email: 'elijah.daniel@example.com', password: 'DriverPass4!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "First Bank", account_number: "3012345678", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '700001', name: 'Nnamso George Walter', email: 'nnamso.walter@example.com', password: 'CleanerPass1!', role: 'Cleaner', is_active: false, pay_type: 'Salary', pay_rate: 30000, bank_name: "Unity Bank", account_number: "0059218669", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '800001', name: 'Benog Security Services', email: 'benog.security@example.com', password: 'SecurityPass1!', role: 'Chief Security', is_active: true, pay_type: 'Salary', pay_rate: 20000, bank_name: "U.B.A", account_number: "2288605641", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '800002', name: 'Nsikak Udo Essiet', email: 'nsikak.essiet@example.com', password: 'SecurityPass2!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "U.B.A", account_number: "2304484777", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '800003', name: 'Aniefon Udo Bassey', email: 'aniefon.bassey@example.com', password: 'SecurityPass3!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "First Bank", account_number: "3090572411", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '000000', name: 'Gabriel Developer', email: 'gabriel.dev@example.com', password: 'DevPassword1!', role: 'Developer', is_active: true, pay_type: 'Salary', pay_rate: 500000, bank_name: "Kuda Bank", account_number: "8901234567", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
];

const recipesData = [
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

const deliveryStaff = staffData.filter(s => s.role === 'Delivery Staff');

const wagesData = staffData.filter(s => s.role !== 'Developer').map(s => {
    const totalDeductions = (s as any).deductions?.shortages || 0 + (s as any).deductions?.advanceSalary || 0 + (s as any).deductions?.debt || 0 + (s as any).deductions?.fine || 0;
    const netPay = (s.pay_rate || 0) + ((s as any).additions || 0) - totalDeductions;
    return {
        id: `wage_${s.staff_id}`,
        staffId: s.staff_id,
        staffName: s.name,
        basePay: s.pay_rate,
        additions: Math.random() > 0.8 ? s.pay_rate * 0.1 : 0, // 10% bonus for some
        deductions: {
            shortages: 0,
            advanceSalary: Math.random() > 0.9 ? 10000 : 0, // Advance for some
            debt: 0,
            fine: Math.random() > 0.95 ? 5000 : 0, // Fine for few
        },
        netPay: netPay, // This will be recalculated before saving if needed, here it's for seeding.
        month: format(daysAgo(35).toDate(), 'MMMM yyyy'),
        date: daysAgo(35),
        role: s.role,
    }
});


// --- HELPER FUNCTIONS ---

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function verifySeedPassword(password: string): Promise<ActionResult> {
  const seedPassword = process.env.SEED_PASSWORD;

  if (!seedPassword) {
    return { success: false, error: "Seed password is not configured on the server." };
  }
  
  if (password === seedPassword) {
    return { success: true };
  } else {
    return { success: false, error: "Invalid password." };
  }
}

async function batchCommit(data: any[], collectionName: string): Promise<ActionResult> {
    const BATCH_SIZE = 500;
    try {
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = data.slice(i, i + BATCH_SIZE);
            for (const item of chunk) {
                let docRef;
                const id = item.id || item.staff_id;
                if (id) {
                    docRef = doc(db, collectionName, id);
                } else {
                    docRef = doc(collection(db, collectionName));
                }
                
                const itemWithTimestamps = { ...item };
                for (const key of Object.keys(itemWithTimestamps)) {
                    if (itemWithTimestamps[key] instanceof Date) {
                        itemWithTimestamps[key] = Timestamp.fromDate(itemWithTimestamps[key]);
                    }
                }

                batch.set(docRef, itemWithTimestamps);
            }
            console.log(`Committing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(data.length / BATCH_SIZE)} for ${collectionName}...`);
            await batch.commit();
        }
        return { success: true };
    } catch (error) {
        console.error(`Error seeding collection ${collectionName}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: `Failed to seed ${collectionName}: ${errorMessage}` };
    }
}

export const collectionsToClear = [
    "products", "staff", "recipes", "promotions", "suppliers", 
    "ingredients", "other_supplies", "customers", "orders", "transfers", 
    "production_batches", "waste_logs", "attendance", "sales", "debt", 
    "directCosts", "indirectCosts", "wages", "closingStocks", 
    "discount_records", "announcements", "reports", "cost_categories",
    "payment_confirmations", "supply_requests", "ingredient_stock_logs",
    "production_logs", "settings"
];

export async function clearCollection(collectionName: string): Promise<ActionResult> {
    const BATCH_SIZE = 500;
    try {
        const q = collection(db, collectionName);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`Collection ${collectionName} is already empty.`);
            return { success: true };
        }

        const batches = [];
        for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            snapshot.docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
            batches.push(batch.commit());
        }

        await Promise.all(batches);
        console.log(`Cleared ${snapshot.size} documents from ${collectionName}`);
        return { success: true };
    } catch (error) {
        console.error(`Error clearing collection ${collectionName}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: `Failed to clear ${collectionName}: ${errorMessage}` };
    }
}

// --- INDIVIDUAL SEEDING FUNCTIONS ---

export async function seedUsersAndConfig(): Promise<ActionResult> {
    try {
        await batchCommit(staffData, "staff");
        const settingsRef = doc(db, 'settings', 'app_config');
        const settingsBatch = writeBatch(db);
        settingsBatch.set(settingsRef, { storeAddress: "123 Bakery Lane, Uyo, Akwa Ibom", staffIdLength: 6 });
        await settingsBatch.commit();
        return { success: true };
    } catch(e) { return { success: false, error: (e as Error).message } }
}

export async function seedProductsAndIngredients(): Promise<ActionResult> {
     try {
        await batchCommit(productsData, "products");
        await batchCommit(recipesData, "recipes");
        await batchCommit([
            { id: "ing_1", name: "All-Purpose Flour", stock: 100.00, unit: 'kg', costPerUnit: 500.00, expiryDate: null, lowStockThreshold: 20 },
            { id: "ing_2", name: "Granulated Sugar", stock: 50.00, unit: 'kg', costPerUnit: 800.00, expiryDate: null, lowStockThreshold: 10 },
            { id: "ing_3", name: "Unsalted Butter", stock: 20.00, unit: 'kg', costPerUnit: 6000.00, expiryDate: null, lowStockThreshold: 5 },
            { id: "ing_4", name: "Large Eggs", stock: 200.00, unit: 'pcs', costPerUnit: 50.00, expiryDate: null, lowStockThreshold: 50 },
            { id: "ing_5", name: "Whole Milk", stock: 30.00, unit: 'L', costPerUnit: 900.00, expiryDate: null, lowStockThreshold: 10 },
            { id: "ing_6", name: "Yeast", stock: 10.00, unit: 'kg', costPerUnit: 2500.00, expiryDate: null, lowStockThreshold: 2 },
            { id: "ing_7", name: "Salt", stock: 10.00, unit: 'kg', costPerUnit: 200.00, expiryDate: null, lowStockThreshold: 2 },
        ], "ingredients");
        await batchCommit([
            { id: "cat_1", name: 'Flour', type: 'direct' },
            { id: 'cat_2', name: 'Sugar', type: 'direct' },
            { id: 'cat_3', name: 'Yeast', type: 'direct' },
            { id: 'cat_4', name: 'Utilities', type: 'indirect' },
            { id: 'cat_5', name: 'Maintenance', type: 'indirect' },
            { id: 'cat_6', name: 'Salary', type: 'indirect' },
        ], "cost_categories");
        return { success: true };
    } catch(e) { return { success: false, error: (e as Error).message } }
}

export async function seedCustomersAndSuppliers(): Promise<ActionResult> {
     try {
        await batchCommit(Array.from({ length: 50 }, (_, i) => ({
            id: `cust_${i + 1}`, name: `Customer ${i + 1}`, phone: `080${10000000 + i}`, email: `customer${i + 1}@example.com`, address: `${i + 1} Main St, City`, joinedDate: daysAgo(Math.floor(Math.random() * 730)), totalSpent: Math.floor(Math.random() * 200000), amountOwed: Math.random() > 0.7 ? Math.floor(Math.random() * 10000) : 0, amountPaid: Math.floor(Math.random() * 50000),
        })), "customers");
        await batchCommit([
            { id: "sup_1", name: "Flour Mills of Nigeria", contactPerson: "Mr. Adebayo", phone: "08012345678", email: "sales@fmnplc.com", address: "Apapa, Lagos", amountOwed: 500000, amountPaid: 450000 },
            { id: "sup_2", name: "Dangote Sugar", contactPerson: "Hajiya Bello", phone: "08087654321", email: "sugar@dangote.com", address: "Ikeja, Lagos", amountOwed: 250000, amountPaid: 250000 },
            { id: "sup_3", name: "Local Yeast Supplier", contactPerson: "Mama Chichi", phone: "07011223344", email: "chichisyeast@email.com", address: "Uyo Main Market", amountOwed: 50000, amountPaid: 20000 },
        ], "suppliers");
        return { success: true };
    } catch(e) { return { success: false, error: (e as Error).message } }
}

export async function seedFinancialRecords(): Promise<ActionResult> {
    try {
        await batchCommit(wagesData, "wages");
        await batchCommit([
            { id: 'dr_1', bread_type: 'Round Loaf', amount: 58000 }, { id: 'dr_2', bread_type: 'Family Loaf', amount: 1200 }, { id: 'dr_3', bread_type: 'Short Loaf', amount: 4700 }, { id: 'dr_4', bread_type: 'Burger', amount: 1000 }, { id: 'dr_5', bread_type: 'Jumbo', amount: 300 }, { id: 'dr_6', bread_type: 'Mini Bite', amount: 550 }, { id: 'dr_7', bread_type: 'Big Bite', amount: 600 },
        ], "discount_records");
        await batchCommit([
             { date: daysAgo(28), description: 'Generator Fuel', category: 'Diesel', amount: 150000 }, { date: daysAgo(20), description: 'Oven Repair', category: 'Repairs', amount: 258500 }, { date: daysAgo(15), description: 'Baking gas refill', category: 'Gas', amount: 80000 }, { date: daysAgo(12), description: 'Packaging Promo', category: 'Promotion', amount: 11000 }, { date: daysAgo(10), description: 'Van Fuel', category: 'Transport', amount: 21900 }, { date: daysAgo(8), description: 'Factory Production materials', category: 'Production', amount: 253230 }, { date: daysAgo(5), description: 'Water Bill', category: 'Water', amount: 15000 }, { date: daysAgo(3), description: 'Misc purchases', category: 'Purchases', amount: 31500 }, { date: daysAgo(1), description: 'PHCN Bill', category: 'Electricity', amount: 45000 },
        ], "indirectCosts");
        await batchCommit([
            { date: daysAgo(25), description: 'Bulk Flour Purchase', category: 'Flour', quantity: 1, total: 2000000 }, { date: daysAgo(20), description: 'Sugar Supply', category: 'Sugar', quantity: 1, total: 1000000 }, { date: daysAgo(15), description: 'Butter & Yeast', category: 'Yeast', quantity: 1, total: 665800 },
        ], "directCosts");
         await batchCommit([
            { id: 'loan_1', date: daysAgo(500), description: "Bal b/f Loan", debit: 100000, credit: null }, { id: 'loan_2', date: daysAgo(200), description: "Loan for Raw Material", debit: 363000, credit: null }, { id: 'loan_3', date: daysAgo(50), description: "Loan repayment", debit: null, credit: 50000 },
        ], "debt");
        return { success: true };
    } catch(e) { return { success: false, error: (e as Error).message } }
}

export async function seedOperationalData(): Promise<ActionResult> {
     try {
        await batchCommit(Array.from({ length: 1500 }, (_, i) => {
            const product = productsData[Math.floor(Math.random() * productsData.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            return {
                id: `ord_${i + 1}`, items: [{ productId: product.id, name: product.name, price: product.price, quantity, costPrice: product.costPrice }], total: product.price * quantity, date: generateRandomDate(0, 730), paymentMethod: Math.random() > 0.5 ? 'Card' : 'Cash', customerName: `Customer ${Math.floor(Math.random() * 50) + 1}`, customerId: `cust_${Math.floor(Math.random() * 50) + 1}`, status: 'Completed', staffId: '500002', staffName: 'Mary Felix Ating'
            }
        }), "orders");
        await batchCommit(staffData.flatMap(s => Array.from({ length: 450 }, (_, i) => { if (Math.random() < 0.2) return null; const clockIn = daysAgo(i); clockIn.toDate().setHours(8 + Math.floor(Math.random()*2), Math.floor(Math.random()*60)); const clockOut = Timestamp.fromMillis(clockIn.toMillis() + ( (8 + Math.random()) * 60 * 60 * 1000)); return { id: `att_${s.staff_id}_${i}`, staff_id: s.staff_id, clock_in_time: clockIn, clock_out_time: clockOut, date: clockIn.toDate().toISOString().split('T')[0] } }).filter(Boolean)), "attendance");
        await batchCommit(Array.from({ length: 300 }, (_, i) => ({ id: `waste_${i + 1}`, productId: `prod_${(i % 10) + 1}`, productName: productsData[i % 10].name, productCategory: productsData[i % 10].category, quantity: Math.floor(Math.random() * 5) + 1, reason: ['Spoiled', 'Damaged', 'Burnt', 'Error'][i % 4], notes: 'Generated seed data', date: generateRandomDate(0, 730), staffId: `500002`, staffName: `Mary Felix Ating` })), "waste_logs");
        await batchCommit(Array.from({ length: 100 }, (_, i) => ({ id: `batch_${i + 1}`, recipeId: `rec_${(i % 2) + 1}`, recipeName: recipesData[i % 2].name, productId: recipesData[i % 2].productId, productName: recipesData[i % 2].productName, requestedById: '300001', requestedByName: 'MR Bassey OFFIONG', quantityToProduce: Math.floor(Math.random() * 50) + 20, status: i < 5 ? 'pending_approval' : (i < 15 ? 'in_production' : 'completed'), createdAt: generateRandomDate(0, 730), approvedAt: generateRandomDate(0, 730), successfullyProduced: Math.floor(Math.random() * 45) + 15, wasted: Math.floor(Math.random() * 5), ingredients: recipesData[i % 2].ingredients })), "production_batches");
        return { success: true };
    } catch(e) { return { success: false, error: (e as Error).message } }
}

export async function seedCommunicationData(): Promise<ActionResult> {
    try {
        await batchCommit([
            { id: 'anno_1', message: 'Welcome to the new Bakery Management System! Please familiarize yourself with your dashboard.', staffId: '100001', staffName: 'Wisdom Effiong Edet', timestamp: daysAgo(5) },
            { id: 'anno_2', message: 'Team meeting tomorrow at 9 AM sharp to discuss Q3 targets. Attendance is mandatory.', staffId: '100001', staffName: 'Wisdom Effiong Edet', timestamp: daysAgo(1) },
            { id: 'anno_3', message: 'Please remember to log all waste accurately at the end of your shift. Thank you.', staffId: '100002', staffName: 'Angela Uwem', timestamp: daysAgo(0) },
        ], "announcements");
        await batchCommit([
            { id: 'rep_1', subject: 'Oven #2 Not Heating Properly', reportType: 'Maintenance', message: 'The main oven (number 2) is not reaching the set temperature. It took much longer to bake the last batch of Family Loaf.', staffId: '300001', staffName: 'MR Bassey OFFIONG', timestamp: daysAgo(2), status: 'new' },
            { id: 'rep_2', subject: 'Suggestion for New Product', reportType: 'Suggestion', message: 'Many customers have been asking if we could start making coconut bread. I think it would be a popular addition.', staffId: '500002', staffName: 'Mary Felix Ating', timestamp: daysAgo(3), status: 'in_progress' },
            { id: 'rep_3', subject: 'Leaky Faucet in Washroom', reportType: 'Maintenance', message: 'The faucet in the staff washroom has been dripping constantly for two days.', staffId: '700001', staffName: 'Nnamso George Walter', timestamp: daysAgo(1), status: 'resolved' },
            { id: 'rep_4', subject: 'Customer Complaint - Meat Pie', reportType: 'Complaint', message: 'A customer reported that the meat pie they bought yesterday was too salty. This was a verbal complaint made at the counter.', staffId: '500002', staffName: 'Mary Felix Ating', timestamp: daysAgo(1), status: 'new' },
        ], "reports");
        return { success: true };
    } catch(e) { return { success: false, error: (e as Error).message } }
}
