
"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, Timestamp, setDoc } from "firebase/firestore";
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
    // SNACKS
    { id: "prod_snacks_1", name: "Meatpie", price: 1000, stock: 0, category: 'Snacks', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'meat pie', costPrice: 600, lowStockThreshold: 50, minPrice: 900, maxPrice: 1100 },
    
    // BREAD
    { id: "prod_bread_1", name: "Family Loaf", price: 1600, stock: 0, category: 'Bread', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf', costPrice: 1000, lowStockThreshold: 50, minPrice: 1500, maxPrice: 1700 },
    { id: "prod_bread_2", name: "Short Loaf", price: 1300, stock: 0, category: 'Bread', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'short bread', costPrice: 800, lowStockThreshold: 50, minPrice: 1200, maxPrice: 1400 },
    { id: "prod_bread_3", name: "Jumbo Loaf", price: 1800, stock: 0, category: 'Bread', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'jumbo bread', costPrice: 1200, lowStockThreshold: 25, minPrice: 1700, maxPrice: 1900 },
    { id: "prod_bread_4", name: "Burger Loaf", price: 1800, stock: 0, category: 'Bread', unit: 'pack', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun', costPrice: 1100, lowStockThreshold: 50, minPrice: 1700, maxPrice: 1900 },
    { id: "prod_bread_5", name: "Round bread", price: 300, stock: 0, category: 'Bread', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread', costPrice: 180, lowStockThreshold: 100, minPrice: 250, maxPrice: 350 },
    { id: "prod_bread_6", name: "Breakfast loaf", price: 1000, stock: 0, category: 'Bread', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'breakfast bread', costPrice: 650, lowStockThreshold: 40, minPrice: 900, maxPrice: 1100 },
    { id: "prod_bread_7", name: "Mini Bite", price: 800, stock: 0, category: 'Bread', unit: 'pack', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'small bread', costPrice: 500, lowStockThreshold: 60, minPrice: 700, maxPrice: 900 },

    // DRINKS
    { id: "prod_drinks_1", name: "Coke", price: 500, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola', costPrice: 350, lowStockThreshold: 100, minPrice: 450, maxPrice: 550 },
    { id: "prod_drinks_2", name: "Fanta", price: 500, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'fanta drink', costPrice: 350, lowStockThreshold: 100, minPrice: 450, maxPrice: 550 },
    { id: "prod_drinks_3", name: "Sprite", price: 500, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'sprite drink', costPrice: 350, lowStockThreshold: 100, minPrice: 450, maxPrice: 550 },
    { id: "prod_drinks_4", name: "Pepsi", price: 500, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'pepsi drink', costPrice: 350, lowStockThreshold: 100, minPrice: 450, maxPrice: 550 },
    { id: "prod_drinks_5", name: "7up", price: 500, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': '7up drink', costPrice: 350, lowStockThreshold: 100, minPrice: 450, maxPrice: 550 },
    { id: "prod_drinks_6", name: "Nutri Soya", price: 800, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'soya milk', costPrice: 600, lowStockThreshold: 80, minPrice: 750, maxPrice: 850 },
    { id: "prod_drinks_7", name: "Nutri Choco", price: 800, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'choco milk', costPrice: 600, lowStockThreshold: 80, minPrice: 750, maxPrice: 850 },
    { id: "prod_drinks_8", name: "5Alive", price: 800, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'juice box', costPrice: 600, lowStockThreshold: 80, minPrice: 750, maxPrice: 850 },
    { id: "prod_drinks_9", name: "Holandia Yoghurt", price: 2000, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'yoghurt drink', costPrice: 1500, lowStockThreshold: 40, minPrice: 1900, maxPrice: 2100 },
    { id: "prod_drinks_10", name: "Freshyo", price: 700, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'yoghurt drink', costPrice: 550, lowStockThreshold: 60, minPrice: 650, maxPrice: 750 },
    { id: "prod_drinks_11", name: "Aquafina water", price: 300, stock: 0, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water', costPrice: 200, lowStockThreshold: 150, minPrice: 250, maxPrice: 350 },
];

const staffData = [
    { staff_id: '100001', name: 'Wisdom Effiong Edet', email: 'wisdom.edet@example.com', password: 'ManagerPass1!', role: 'Manager', is_active: true, pay_type: 'Salary', pay_rate: 150000, bank_name: "MONIPOINT", account_number: "9031612444", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '100002', name: 'Angela Uwem', email: 'angela.uwem@example.com', password: 'SupervisorPass1!', role: 'Supervisor', is_active: true, pay_type: 'Salary', pay_rate: 100000, bank_name: "Access Bank", account_number: "0012345678", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '200001', name: 'Mr Bassey Smith Daniel', email: 'bassey.daniel@example.com', password: 'AccountantPass1!', role: 'Accountant', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Opay", account_number: "8136164826", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300001', name: 'MR Bassey OFFIONG', email: 'bassey.offiong@example.com', password: 'BakerPass1!', role: 'Chief Baker', is_active: true, pay_type: 'Salary', pay_rate: 75000, bank_name: "Opay", account_number: "8066706293", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300002', name: 'Ubom Robert Okon', email: 'ubom.okon@example.com', password: 'BakerPass3!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 35000, bank_name: "MONIPOINT", account_number: "7046450879", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300003', name: 'Zion Ekerete', email: 'zion.ekerete@example.com', password: 'BakerPass4!', role: 'Bakery Assistant', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "OPAY", account_number: "7041091374", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300004', name: 'Grace Effiong', email: 'grace.effiong@example.com', password: 'AssistantPass1!', role: 'Bakery Assistant', is_active: true, pay_type: 'Salary', pay_rate: 38000, bank_name: "GTB", account_number: "0123456789", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400001', name: 'Mary Ating', email: 'mary.ating@example.com', password: 'StorekeeperPass1!', role: 'Storekeeper', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "PALMPAY", account_number: "9126459437", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '500001', name: 'Mr Patrick', email: 'mr.patrick@example.com', password: 'ShowroomPass1!', role: 'Showroom Staff', is_active: true, pay_type: 'Salary', pay_rate: 40000, bank_name: "UBA", account_number: "1231231234", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
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

const ingredientsData = [
    { id: "ing_1", name: "Flour", stock: 0, unit: 'g', costPerUnit: 1.09, expiryDate: null, lowStockThreshold: 10000 },
    { id: "ing_2", name: "Sugar", stock: 0, unit: 'g', costPerUnit: 1.58, expiryDate: null, lowStockThreshold: 1000 },
    { id: "ing_3", name: "Salt", stock: 0, unit: 'g', costPerUnit: 0.34, expiryDate: null, lowStockThreshold: 500 },
    { id: "ing_4", name: "Yeast", stock: 0, unit: 'g', costPerUnit: 6.40, expiryDate: null, lowStockThreshold: 200 },
    { id: "ing_5", name: "Preservative", stock: 0, unit: 'g', costPerUnit: 8.00, expiryDate: null, lowStockThreshold: 100 },
    { id: "ing_6", name: "Tin Milk", stock: 0, unit: 'pcs', costPerUnit: 1000.00, expiryDate: null, lowStockThreshold: 10 },
    { id: "ing_7", name: "Butter", stock: 0, unit: 'g', costPerUnit: 2.53, expiryDate: null, lowStockThreshold: 1000 },
    { id: "ing_8", name: "Butterscotch Flavor", stock: 0, unit: 'g', costPerUnit: 10.00, expiryDate: null, lowStockThreshold: 50 },
    { id: "ing_9", name: "Zeast Flavor", stock: 0, unit: 'g', costPerUnit: 27.00, expiryDate: null, lowStockThreshold: 50 },
    { id: "ing_10", name: "Lux Essence", stock: 0, unit: 'g', costPerUnit: 17.00, expiryDate: null, lowStockThreshold: 50 },
    { id: "ing_11", name: "Eggs", stock: 0, unit: 'pcs', costPerUnit: 176.67, expiryDate: null, lowStockThreshold: 24 },
    { id: "ing_12", name: "Water", stock: 0, unit: 'ml', costPerUnit: 0.00, expiryDate: null, lowStockThreshold: 5000 },
    { id: "ing_13", name: "Vegetable Oil", stock: 0, unit: 'ml', costPerUnit: 3.40, expiryDate: null, lowStockThreshold: 500 },
    { id: "ing_14", name: "Bread Improver", stock: 0, unit: 'g', costPerUnit: 60, expiryDate: null, lowStockThreshold: 100 },
];

const recipesData = [
    {
       id: "rec_general",
       name: "General Bread Production",
       description: "The standard recipe for producing all bread types.",
       ingredients: [
           { ingredientId: "ing_1", ingredientName: "Flour", quantity: 50000, unit: "g" },
           { ingredientId: "ing_2", ingredientName: "Sugar", quantity: 4500, unit: "g" },
           { ingredientId: "ing_3", ingredientName: "Salt", quantity: 450, unit: "g" },
           { ingredientId: "ing_4", ingredientName: "Yeast", quantity: 500, unit: "g" },
           { ingredientId: "ing_5", ingredientName: "Preservative", quantity: 150, unit: "g" },
           { ingredientId: "ing_6", ingredientName: "Tin Milk", quantity: 6, unit: "pcs" },
           { ingredientId: "ing_7", ingredientName: "Butter", quantity: 5000, unit: "g" },
           { ingredientId: "ing_8", ingredientName: "Butterscotch Flavor", quantity: 100, unit: "g" },
           { ingredientId: "ing_9", ingredientName: "Zeast Flavor", quantity: 60, unit: "g" },
           { ingredientId: "ing_10", ingredientName: "Lux Essence", quantity: 100, unit: "g" },
           { ingredientId: "ing_11", ingredientName: "Eggs", quantity: 12, unit: "pcs" },
           { ingredientId: "ing_12", ingredientName: "Water", quantity: 20000, unit: "ml" },
           { ingredientId: "ing_13", ingredientName: "Vegetable Oil", quantity: 300, unit: "ml" },
           { ingredientId: "ing_14", ingredientName: "Bread Improver", quantity: 250, unit: "g" },
       ]
    }
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
  cleared?: string[];
  errors?: string[];
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

export async function clearMultipleCollections(collectionNames: string[]): Promise<ActionResult> {
    const cleared: string[] = [];
    const errors: string[] = [];
    for (const name of collectionNames) {
        const result = await clearCollection(name);
        if (result.success) {
            cleared.push(name);
        } else {
            errors.push(name);
        }
    }
    if (errors.length > 0) {
        return { success: false, cleared, errors };
    }
    return { success: true, cleared };
}

// --- INDIVIDUAL SEEDING FUNCTIONS ---

export async function seedDeveloperData(): Promise<ActionResult> {
    try {
        const devUser = staffData.find(s => s.role === 'Developer');
        if (!devUser) {
            return { success: false, error: "Developer user not found in seed data." };
        }
        const devRef = doc(db, "staff", devUser.staff_id);
        await setDoc(devRef, devUser);
        
        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

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
        await batchCommit(ingredientsData, "ingredients");
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
        await batchCommit(Array.from({ length: 10 }, (_, i) => ({
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
            { id: 'dr_1', bread_type: 'Round Loaf', amount: 58000 }, { id: 'dr_2', bread_type: 'Family Loaf', amount: 1200 }, { id: 'dr_3', bread_type: 'Short Loaf', amount: 4700 }, { id: 'dr_4', bread_type: 'Burger', amount: 1000 }, { id: 'dr_5', bread_type: 'Jumbo', amount: 300 }, { id: 'dr_6', name: 'Mini Bite', amount: 550 }, { id: 'dr_7', name: 'Big Bite', amount: 600 },
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
        const nonDeveloperStaff = staffData.filter(s => s.role !== 'Developer');
        const attendanceData = Array.from({ length: 20 }, (_, i) => {
            const staffMember = nonDeveloperStaff[i % nonDeveloperStaff.length];
            const clockInDate = generateRandomDate(1, 30);
            const clockInTimestamp = clockInDate.toDate();
            clockInTimestamp.setHours(Math.floor(Math.random() * 2) + 8); // Clock in between 8-9 AM
            
            const clockOutTimestamp = new Date(clockInTimestamp.getTime());
            clockOutTimestamp.setHours(clockInTimestamp.getHours() + Math.floor(Math.random() * 4) + 5); // Work 5-8 hours
            
            return {
                id: `att_${i + 1}`,
                staff_id: staffMember.staff_id,
                clock_in_time: Timestamp.fromDate(clockInTimestamp),
                clock_out_time: Math.random() > 0.1 ? Timestamp.fromDate(clockOutTimestamp) : null, // 10% chance to be currently clocked in
                date: format(clockInTimestamp, 'yyyy-MM-dd')
            };
        });
        await batchCommit(attendanceData, "attendance");

        await batchCommit(Array.from({ length: 10 }, (_, i) => {
            const product = productsData[Math.floor(Math.random() * productsData.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            return {
                id: `ord_${i + 1}`, items: [{ productId: product.id, name: product.name, price: product.price, quantity, costPrice: product.costPrice }], total: product.price * quantity, date: generateRandomDate(0, 30), paymentMethod: Math.random() > 0.5 ? 'Card' : 'Cash', customerName: `Customer ${Math.floor(Math.random() * 10) + 1}`, customerId: `cust_${Math.floor(Math.random() * 10) + 1}`, status: 'Completed', staffId: '500002', staffName: 'Mary Felix Ating'
            }
        }), "orders");
        
        await batchCommit(Array.from({ length: 10 }, (_, i) => ({ id: `waste_${i + 1}`, productId: `prod_${(i % 10) + 1}`, productName: productsData[i % 10].name, productCategory: productsData[i % 10].category, quantity: Math.floor(Math.random() * 5) + 1, reason: ['Spoiled', 'Damaged', 'Burnt', 'Error'][i % 4], notes: 'Generated seed data', date: generateRandomDate(0, 30), staffId: `500002`, staffName: `Mary Felix Ating` })), "waste_logs");
        await batchCommit(Array.from({ length: 5 }, (_, i) => ({ id: `batch_${i + 1}`, recipeId: `rec_general`, recipeName: 'General Bread Production', productId: 'multi-product', productName: 'General Production', requestedById: '300001', requestedByName: 'MR Bassey OFFIONG', quantityToProduce: 1, status: i < 2 ? 'pending_approval' : (i < 4 ? 'in_production' : 'completed'), createdAt: generateRandomDate(0, 30), approvedAt: generateRandomDate(0, 30), successfullyProduced: Math.floor(Math.random() * 45) + 15, wasted: Math.floor(Math.random() * 5), ingredients: recipesData[0].ingredients })), "production_batches");
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

export async function clearAllData(): Promise<ActionResult> {
    const allCollections = [
        "products", "staff", "recipes", "promotions", "suppliers", 
        "ingredients", "other_supplies", "customers", "orders", "transfers", 
        "production_batches", "waste_logs", "attendance", "sales", "debt", 
        "directCosts", "indirectCosts", "wages", "closingStocks", 
        "discount_records", "announcements", "reports", "cost_categories",
        "payment_confirmations", "supply_requests", "ingredient_stock_logs",
        "production_logs", "settings"
    ];
    let allSucceeded = true;
    let finalError = "";

    for (const collectionName of allCollections) {
        const result = await clearCollection(collectionName);
        if (!result.success) {
            allSucceeded = false;
            finalError = result.error || `Failed to clear ${collectionName}`;
            break; 
        }
    }
    if (allSucceeded) {
        return { success: true };
    }
    return { success: false, error: finalError };
}

export async function seedFullData(): Promise<ActionResult> {
    const seedFunctions = [
        seedUsersAndConfig,
        seedProductsAndIngredients,
        seedCustomersAndSuppliers,
        seedFinancialRecords,
        seedOperationalData,
        seedCommunicationData
    ];
     let allSucceeded = true;
     let finalError = "";

     for (const seedFn of seedFunctions) {
        const result = await seedFn();
        if (!result.success) {
            allSucceeded = false;
            finalError = result.error || 'An unknown seeding error occurred.';
            break;
        }
     }
      if (allSucceeded) {
        return { success: true };
    }
    return { success: false, error: finalError };
}


export async function seedSpecialScenario(): Promise<ActionResult> {
    try {
        // 1. Clear all data
        await clearAllData();

        // 2. Seed specific staff
        const staffToSeed = [
            staffData.find(s => s.role === 'Manager'),
            staffData.find(s => s.role === 'Developer'),
            staffData.find(s => s.role === 'Accountant'),
            staffData.find(s => s.role === 'Storekeeper'),
            staffData.find(s => s.role === 'Baker'),
            staffData.find(s => s.role === 'Delivery Staff'),
            staffData.find(s => s.name === 'Mr Patrick' && s.role === 'Showroom Staff'),
        ].filter(Boolean) as typeof staffData; // Filter out any not found
        
        if (staffToSeed.length < 7) {
            return { success: false, error: "A required staff member for the special scenario was not found in the seed data." };
        }
        await batchCommit(staffToSeed, 'staff');

        const manager = staffToSeed.find(s => s!.role === 'Manager')!;
        const mrPatrick = staffToSeed.find(s => s!.name === 'Mr Patrick')!;

        // 3. Seed Products with specific stock for MAIN INVENTORY
        const specialProducts = productsData.map(p => {
            const stockMap: Record<string, number> = {
                "prod_bread_5": 152, // Round bread
                "prod_bread_1": 26,  // Family Loaf
                "prod_bread_2": 73, // Short Loaf
                "prod_bread_4": 10,   // Burger Loaf
                "prod_bread_3": 49, // Jumbo Loaf
            };
            return { ...p, stock: stockMap[p.id] || 0 };
        });
        await batchCommit(specialProducts, "products");

        // 4. Seed Ingredients with specific stock
        const specialIngredients = ingredientsData.map(i => {
            const stockMap: Record<string, number> = {
                "ing_6": 6,     // Tin Milk
                "ing_11": 42,   // Eggs
                "ing_14": 500   // Bread Improver
            };
            return { ...i, stock: stockMap[i.id] || 0 };
        });
        await batchCommit(specialIngredients, "ingredients");
        
        // 5. Seed Other Supplies
        const otherSuppliesData = [
            { id: "sup_other_1", name: "Nurse Caps", stock: 10, unit: 'packs', costPerUnit: 500, category: 'Packaging' },
            { id: "sup_other_2", name: "Cotton Wool", stock: 1, unit: 'pack', costPerUnit: 1000, category: 'Other' },
            { id: "sup_other_3", name: "Spirit", stock: 1, unit: 'pack', costPerUnit: 800, category: 'Other' },
            { id: "sup_other_4", name: "Glove", stock: 3, unit: 'packs', costPerUnit: 1200, category: 'Packaging' },
        ];
        await batchCommit(otherSuppliesData, "other_supplies");
        
        // 6. Create and complete a transfer to Mr Patrick
        const patrickStock = [
            { productId: "prod_bread_1", productName: "Family Loaf", quantity: 21 }, // Family (6 + 15)
            { productId: "prod_bread_2", productName: "Short Loaf", quantity: 23 },
        ];
        
        const transferBatch = writeBatch(db);
        
        // Create the transfer document
        const transferRef = doc(collection(db, 'transfers'));
        transferBatch.set(transferRef, {
            from_staff_id: manager.staff_id,
            from_staff_name: manager.name,
            to_staff_id: mrPatrick.staff_id,
            to_staff_name: mrPatrick.name,
            items: patrickStock,
            date: Timestamp.now(),
            status: 'completed', // Mark as completed to simulate acceptance
            is_sales_run: false,
            time_received: Timestamp.now(),
            time_completed: Timestamp.now(),
            totalRevenue: 0 // Not a sales run
        });
        
        // Create personal stock for Mr Patrick
        for (const item of patrickStock) {
            const personalStockRef = doc(db, 'staff', mrPatrick.staff_id, 'personal_stock', item.productId);
            transferBatch.set(personalStockRef, {
                productId: item.productId,
                productName: item.productName,
                stock: item.quantity
            });
        }
        
        await transferBatch.commit();
        
        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}
