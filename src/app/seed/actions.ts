
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

const productsData = [
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

const staffData = [
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
    { staff_id: '110011', name: 'Benog Security Services', email: 'benog.security@example.com', password: 'SecurityPass1!', role: 'Chief Security', is_active: true, pay_type: 'Salary', pay_rate: 20000, bank_name: "U.B.A", account_number: "2288605641", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '120012', name: 'Nsikak Udo Essiet', email: 'nsikak.essiet@example.com', password: 'SecurityPass2!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "U.B.A", account_number: "2304484777", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '130013', name: 'Aniefon Udo Bassey', email: 'aniefon.bassey@example.com', password: 'SecurityPass3!', role: 'Security', is_active: true, pay_type: 'Salary', pay_rate: 25000, bank_name: "First Bank", account_number: "3090572411", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
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

const seedData = {
  products: productsData,
  staff: staffData,
  recipes: recipesData,
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
      const product = productsData[Math.floor(Math.random() * productsData.length)];
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
      items: [{ productId: `prod_${(i % 10) + 1}`, productName: productsData[i % 10].name, quantity: Math.floor(Math.random() * 20) + 10 }],
      date: generateRandomDate(0, 730),
      status: Math.random() > 0.1 ? 'pending' : 'completed',
      is_sales_run: i % 2 !== 0,
      totalCollected: 0
  })),
  production_batches: Array.from({ length: 100 }, (_, i) => ({
      id: `batch_${i + 1}`,
      recipeId: `rec_${(i % 2) + 1}`,
      recipeName: recipesData[i % 2].name,
      productId: recipesData[i % 2].productId,
      productName: recipesData[i % 2].productName,
      requestedById: '300003',
      requestedByName: 'MR Bassey OFFIONG',
      quantityToProduce: Math.floor(Math.random() * 50) + 20,
      status: i < 5 ? 'pending_approval' : (i < 15 ? 'in_production' : 'completed'),
      createdAt: generateRandomDate(0, 730),
      approvedAt: generateRandomDate(0, 730),
      successfullyProduced: Math.floor(Math.random() * 45) + 15,
      wasted: Math.floor(Math.random() * 5),
      ingredients: recipesData[i % 2].ingredients
  })),
  waste_logs: Array.from({ length: 300 }, (_, i) => ({
    id: `waste_${i + 1}`,
    productId: `prod_${(i % 10) + 1}`,
    productName: productsData[i % 10].name,
    productCategory: productsData[i % 10].category,
    quantity: Math.floor(Math.random() * 5) + 1,
    reason: ['Spoiled', 'Damaged', 'Burnt', 'Error'][i % 4],
    notes: 'Generated seed data',
    date: generateRandomDate(0, 730),
    staffId: `400004`,
    staffName: `Mr Ukeme Akpan Thompson`
  })),
  attendance: staffData.flatMap(s => 
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
  sales: [
    { date: daysAgo(30), description: "Sale", cash: 6850, transfer: 19300, pos: 5200, creditSales: 0, shortage: 0, total: 31350 },
    { date: daysAgo(29), description: "Sale", cash: 33600, transfer: 18400, pos: 4200, creditSales: 117900, shortage: 0, total: 174100 },
    { date: daysAgo(28), description: "Sale", cash: 65400, transfer: 31350, pos: 6900, creditSales: 202900, shortage: 0, total: 306550 },
    { date: daysAgo(27), description: "Sale", cash: 42300, transfer: 55600, pos: 7700, creditSales: 118300, shortage: 0, total: 223900 },
    { date: daysAgo(26), description: "Sale", cash: 7200, transfer: 1800, pos: 5200, creditSales: 0, shortage: 0, total: 14200 },
    { date: daysAgo(25), description: "Sale", cash: 72550, transfer: 24600, pos: 7700, creditSales: 78100, shortage: 0, total: 182950 },
    { date: daysAgo(24), description: "Sale", cash: 47400, transfer: 26700, pos: 12600, creditSales: 145200, shortage: 0, total: 231900 },
    { date: daysAgo(23), description: "Sale", cash: 23100, transfer: 3200, pos: 20000, creditSales: 0, shortage: 0, total: 46300 },
    { date: daysAgo(22), description: "Sale", cash: 43800, transfer: 10600, pos: 8000, creditSales: 110000, shortage: 0, total: 172400 },
    { date: daysAgo(21), description: "Sale", cash: 34000, transfer: 25500, pos: 0, creditSales: 61500, shortage: 0, total: 121000 },
    { date: daysAgo(20), description: "Sale", cash: 55100, transfer: 14900, pos: 2900, creditSales: 97900, shortage: 0, total: 170800 },
    { date: daysAgo(19), description: "Sale", cash: 25000, transfer: 89100, pos: 3600, creditSales: 100000, shortage: 24320, total: 242020 },
    { date: daysAgo(18), description: "Sale", cash: 13700, transfer: 85000, pos: 3100, creditSales: 44350, shortage: 0, total: 146150 },
    { date: daysAgo(17), description: "Sale", cash: 7500, transfer: 6300, pos: 1800, creditSales: 121800, shortage: 0, total: 137400 },
    { date: daysAgo(16), description: "Sale", cash: 3150, transfer: 2900, pos: 1800, creditSales: 0, shortage: 0, total: 7850 },
    { date: daysAgo(15), description: "Sale", cash: 800, transfer: 4800, pos: 0, creditSales: 0, shortage: 0, total: 5600 },
    { date: daysAgo(14), description: "Sale", cash: 7600, transfer: 18500, pos: 5600, creditSales: 0, shortage: 0, total: 31700 },
    { date: daysAgo(13), description: "Sale", cash: 34200, transfer: 19000, pos: 4200, creditSales: 112900, shortage: 0, total: 170300 },
    { date: daysAgo(12), description: "Sale", cash: 55350, transfer: 40100, pos: 7100, creditSales: 113900, shortage: 0, total: 216450 },
    { date: daysAgo(11), description: "Sale", cash: 69800, transfer: 57850, pos: 5900, creditSales: 131800, shortage: 0, total: 265350 },
    { date: daysAgo(10), description: "Sale", cash: 73100, transfer: 13700, pos: 2000, creditSales: 177500, shortage: 0, total: 266300 },
    { date: daysAgo(9), description: "Sale", cash: 57500, transfer: 78050, pos: 2800, creditSales: 0, shortage: 0, total: 138350 },
    { date: daysAgo(8), description: "Sale", cash: 92850, transfer: 44900, pos: 600, creditSales: 123300, shortage: 0, total: 261650 },
    { date: daysAgo(7), description: "Sale", cash: 20850, transfer: 59700, pos: 11300, creditSales: 105500, shortage: 0, total: 197350 },
    { date: daysAgo(6), description: "Sale", cash: 37700, transfer: 22300, pos: 3400, creditSales: 175700, shortage: 0, total: 239100 },
    { date: daysAgo(5), description: "Sale", cash: 64100, transfer: 50500, pos: 1600, creditSales: 7100, shortage: 0, total: 123300 },
    { date: daysAgo(4), description: "Sale", cash: 37050, transfer: 19100, pos: 4100, creditSales: 201800, shortage: 0, total: 262050 },
    { date: daysAgo(3), description: "Sale", cash: 87250, transfer: 13750, pos: 4000, creditSales: 119800, shortage: 0, total: 224800 },
    { date: daysAgo(2), description: "Sale", cash: 15700, transfer: 9700, pos: 11200, creditSales: 0, shortage: 0, total: 36600 },
    { date: daysAgo(1), description: "Sale", cash: 50700, transfer: 16800, pos: 9700, creditSales: 158000, shortage: 0, total: 235200 },
  ],
  debt: [
    { id: 'loan_1', date: daysAgo(500), description: "Bal b/f Loan", debit: 100000, credit: null },
    { id: 'loan_2', date: daysAgo(200), description: "Loan for Raw Material", debit: 363000, credit: null },
    { id: 'loan_3', date: daysAgo(50), description: "Loan repayment", debit: null, credit: 50000 },
  ],
  directCosts: Array.from({ length: 730 }, (_, i) => {
    const categories = ["Flour", "Sugar", "Butter", "Yeast", "Milk", "Egg", "Preservative"];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const quantity = Math.floor(Math.random() * 10) + 1;
    const total = (Math.floor(Math.random() * 5000) + 500) * quantity;
    return { date: daysAgo(i), description: `Purchase of ${category}`, category, quantity, total };
  }),
  indirectCosts: Array.from({ length: 730 }, (_, i) => {
    if (Math.random() < 0.7) return null; // Make it less frequent
    const categories = ["Diesel", "Petrol", "Nylon", "Repair", "General Expenses", "Cleaning", "Transportation", "Utilities"];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.floor(Math.random() * 40000) + 2000;
    return { date: daysAgo(i), description: `Expense for ${category}`, category, amount };
  }).filter(Boolean),
  wages: staffData.flatMap(s => 
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
