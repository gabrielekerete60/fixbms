
"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";

// Helper to create timestamps for recent days
const daysAgo = (days: number) => Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - days)));

const seedData = {
  products: [
      { id: "prod_1", name: "Family Loaf", price: 550.00, stock: 50, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf', costPrice: 300 },
      { id: "prod_2", name: "Burger Loaf", price: 450.00, stock: 30, category: 'Breads', unit: 'pack', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun', costPrice: 250 },
      { id: "prod_3", name: "Jumbo Loaf", price: 900.00, stock: 25, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread', costPrice: 500 },
      { id: "prod_4", name: "Round Loaf", price: 500.00, stock: 40, category: 'Breads', unit: 'loaf', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread', costPrice: 280 },
      { id: "prod_5", name: "Croissant", price: 400.00, stock: 60, category: 'Pastries', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'croissant pastry', costPrice: 220 },
      { id: "prod_6", name: "Meat Pie", price: 600.00, stock: 45, category: 'Pastries', unit: 'pcs', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'meat pie', costPrice: 350 },
      { id: "prod_7", name: "Coca-Cola (50cl)", price: 300.00, stock: 100, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola', costPrice: 200 },
      { id: "prod_8", name: "Bottled Water (75cl)", price: 150.00, stock: 150, category: 'Drinks', unit: 'bottle', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water', costPrice: 100 },
  ],
  staff: [
    { staff_id: '100001', name: 'Chris Manager', email: 'chris.manager@example.com', password: 'ManagerPass1!', role: 'Manager', is_active: true, pay_type: 'Salary', pay_rate: 350000, bank_name: "GTBank", account_number: "0123456789", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '200002', name: 'Vic Supervisor', email: 'vic.supervisor@example.com', password: 'SupervisorPass1!', role: 'Supervisor', is_active: true, pay_type: 'Salary', pay_rate: 250000, bank_name: "First Bank", account_number: "1234567890", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300003', name: 'Favour Accountant', email: 'favour.accountant@example.com', password: 'AccountantPass1!', role: 'Accountant', is_active: true, pay_type: 'Salary', pay_rate: 200000, bank_name: "UBA", account_number: "2345678901", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400004', name: 'Mfon Showroom', email: 'mfon.staff@example.com', password: 'StaffPass1!', role: 'Showroom Staff', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Zenith Bank", account_number: "3456789012", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400005', name: 'Akan Delivery', email: 'akan.staff@example.com', password: 'StaffPass1!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Access Bank", account_number: "4567890123", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '500006', name: 'Blessing Baker', email: 'blessing.baker@example.com', password: 'BakerPass1!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 150000, bank_name: "Wema Bank", account_number: "5678901234", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600007', name: 'John Cleaner', email: 'john.cleaner@example.com', password: 'CleanerPass1!', role: 'Cleaner', is_active: false, pay_type: 'Hourly', pay_rate: 500, bank_name: "FCMB", account_number: "6789012345", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '700008', name: 'David Storekeeper', email: 'david.storekeeper@example.com', password: 'StorekeeperPass1!', role: 'Storekeeper', is_active: true, pay_type: 'Salary', pay_rate: 100000, bank_name: "Stanbic IBTC", account_number: "7890123456", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '000000', name: 'Gabriel Developer', email: 'gabriel.dev@example.com', password: 'DevPassword1!', role: 'Developer', is_active: true, pay_type: 'Salary', pay_rate: 500000, bank_name: "Kuda Bank", account_number: "8901234567", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
  ],
  promotions: [
    { id: "promo_1", name: "Weekend Special", description: "10% off all bread items", type: "percentage", value: 10, code: "WEEKEND10", startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), applicableProducts: [], usageLimit: 100, timesUsed: 12 },
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
  customers: [
      { id: 'cust_1', name: 'Adebisi Onyeka', phone: '08012345678', email: 'a.onyeka@example.com', address: '123, Allen Avenue, Ikeja', joinedDate: Timestamp.fromDate(new Date('2023-01-15T10:00:00Z')), totalSpent: 150000, amountOwed: 5000, amountPaid: 0 },
      { id: 'cust_2', name: 'Ngozi Okoro', phone: '09087654321', email: 'n.okoro@example.com', address: '45, Lekki Phase 1', joinedDate: Timestamp.fromDate(new Date('2023-02-20T11:30:00Z')), totalSpent: 75000, amountOwed: 0, amountPaid: 75000 },
      { id: 'cust_3', name: 'Chinedu Alabi', phone: '08022334455', email: 'c.alabi@example.com', address: '78, Airport Road, Uyo', joinedDate: daysAgo(30), totalSpent: 25000, amountOwed: 10000, amountPaid: 5000 },
  ],
   orders: [
    {
      id: "ord_1",
      items: [{ productId: "prod_1", name: "Family Loaf", price: 550, quantity: 2, costPrice: 300 }],
      total: 1100,
      date: daysAgo(2), 
      paymentMethod: 'Card',
      customerName: 'Adebisi Onyeka',
      customerId: 'cust_1',
      status: 'Completed',
      staffId: '400004'
    },
    {
      id: "ord_2",
      items: [
        { productId: "prod_3", name: "Jumbo Loaf", price: 900, quantity: 1, costPrice: 500 },
        { productId: "prod_7", name: "Coca-Cola (50cl)", price: 300, quantity: 2, costPrice: 200 },
      ],
      total: 1500,
      date: daysAgo(1),
      paymentMethod: 'Cash',
      customerName: 'Ngozi Okoro',
      customerId: 'cust_2',
      status: 'Completed',
      staffId: '400004'
    },
     {
      id: "ord_3",
      items: [
        { productId: "prod_6", name: "Meat Pie", price: 600, quantity: 5, costPrice: 350 },
      ],
      total: 3000,
      date: daysAgo(3),
      paymentMethod: 'Credit',
      customerName: 'Chinedu Alabi',
      customerId: 'cust_3',
      status: 'Completed',
      staffId: '400005',
      salesRunId: 'tsr_1_active'
    },
  ],
  transfers: [
      { id: "tsr_1_active", from_staff_id: "700008", from_staff_name: "David Storekeeper", to_staff_id: "400005", to_staff_name: "Akan Delivery", items: [{ productId: "prod_1", productName: "Family Loaf", quantity: 20 }, { productId: "prod_6", productName: "Meat Pie", quantity: 15 }], date: daysAgo(1), status: 'active', is_sales_run: true, totalCollected: 0 },
      { id: "trans_1_pending", from_staff_id: "700008", from_staff_name: "David Storekeeper", to_staff_id: "400004", to_staff_name: "Mfon Showroom", items: [{ productId: "prod_2", productName: "Burger Loaf", quantity: 10 }], date: Timestamp.now(), status: 'pending', is_sales_run: false },
       { id: "tsr_2_prod_return", from_staff_id: "500006", from_staff_name: "Blessing Baker", to_staff_id: "700008", to_staff_name: "David Storekeeper", items: [{ productId: "prod_1", productName: "Family Loaf", quantity: 50 }], date: daysAgo(0), status: 'pending', is_sales_run: false, notes: 'Return from production batch batch_3_completed_9999' },
  ],
  production_batches: [
    {
        id: 'batch_1_pending_1234',
        recipeId: 'rec_1',
        recipeName: 'Standard Family Loaf',
        productId: 'prod_1',
        productName: 'Family Loaf',
        requestedById: '500006',
        requestedByName: 'Blessing Baker',
        quantityToProduce: 20,
        status: 'pending_approval',
        createdAt: daysAgo(1),
        approvedAt: null,
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 10, unit: "kg" },
            { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.2, unit: "kg" },
        ]
    },
    {
        id: 'batch_2_in_prod_5678',
        recipeId: 'rec_2',
        recipeName: 'Classic Croissant',
        productId: 'prod_5',
        productName: 'Croissant',
        requestedById: '500006',
        requestedByName: 'Blessing Baker',
        quantityToProduce: 100,
        status: 'in_production',
        createdAt: daysAgo(2),
        approvedAt: daysAgo(1),
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 25, unit: "kg", openingStock: 100, closingStock: 75 },
            { ingredientId: "ing_3", ingredientName: "Unsalted Butter", quantity: 15, unit: "kg", openingStock: 20, closingStock: 5 },
            { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.7, unit: "kg", openingStock: 10, closingStock: 9.3 },
        ]
    },
    {
        id: 'batch_3_completed_9999',
        recipeId: 'rec_1',
        recipeName: 'Standard Family Loaf',
        productId: 'prod_1',
        productName: 'Family Loaf',
        requestedById: '500006',
        requestedByName: 'Blessing Baker',
        quantityToProduce: 55,
        status: 'completed',
        createdAt: daysAgo(2),
        approvedAt: daysAgo(2),
        successfullyProduced: 50,
        wasted: 5,
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 27.5, unit: "kg", openingStock: 75, closingStock: 47.5 },
        ]
    }
  ],
  production_logs: [
      { action: 'Recipe Created', details: 'Created new recipe: Standard Family Loaf', staffId: '100001', staffName: 'Chris Manager', timestamp: daysAgo(3) },
      { action: 'Batch Requested', details: 'Requested 20 of Family Loaf for batch batch_1_pending_1234', staffId: '500006', staffName: 'Blessing Baker', timestamp: daysAgo(1) },
      { action: 'Batch Approved', details: 'Approved batch for 100 of Croissant: batch_2_in_prod_5678', staffId: '700008', staffName: 'David Storekeeper', timestamp: daysAgo(1) },
      { action: 'Batch Completed', details: 'Completed batch of Family Loaf with 50 produced and 5 wasted: batch_3_completed_9999', staffId: '500006', staffName: 'Blessing Baker', timestamp: daysAgo(0) },
  ],
  ingredient_stock_logs: [
      { id: "supply_log_1", ingredientId: "ing_1", ingredientName: "All-Purpose Flour", change: 50, reason: "Purchase from Flour Mills of Nigeria", date: daysAgo(5), staffName: "David Storekeeper", logRefId: "sup_1" },
      { id: "prod_log_1", ingredientId: "", ingredientName: "Production Batch: Classic Croissant", change: -40.7, reason: "Production: Classic Croissant", date: daysAgo(1), staffName: "David Storekeeper", logRefId: "batch_2_in_prod_5678" },
  ],
   payment_confirmations: [
    { id: 'pay_conf_1', date: daysAgo(0), driverId: '400005', driverName: 'Akan Delivery', runId: 'tsr_1_active', amount: 2000, status: 'pending', customerName: 'New Customer', items: [], isDebtPayment: true, customerId: 'cust_1' },
    { id: 'pay_conf_2', date: daysAgo(1), driverId: '400005', driverName: 'Akan Delivery', runId: 'tsr_1_active', amount: 1500, status: 'approved', customerName: 'Old Customer', items: [], isDebtPayment: true, customerId: 'cust_2' },
  ],
  expenses: [
    { id: 'exp_1', category: 'Utilities', description: 'NEPA Bill', amount: 25000, date: daysAgo(5).toDate().toISOString() },
    { id: 'exp_2', category: 'Logistics', description: 'Fuel for delivery van', amount: 15000, date: daysAgo(2).toDate().toISOString() },
  ],
  announcements: [
    { id: 'anno_1', staffId: '100001', staffName: 'Chris Manager', message: 'Team meeting tomorrow at 9 AM sharp.', timestamp: daysAgo(0) },
    { id: 'anno_2', staffId: '200002', staffName: 'Vic Supervisor', message: 'Please remember to clean your stations before closing.', timestamp: daysAgo(1) },
  ],
  reports: [
    { id: 'rep_1', subject: 'Faulty Mixer', reportType: 'Maintenance', message: 'The main mixer in the kitchen is making a loud noise.', staffId: '500006', staffName: 'Blessing Baker', timestamp: daysAgo(0), status: 'new' },
  ],
  waste_logs: [
    { id: 'waste_1', productId: 'prod_1', productName: 'Family Loaf', productCategory: 'Breads', quantity: 2, reason: 'Spoiled', staffId: '400004', staffName: 'Mfon Showroom', date: daysAgo(1) },
  ],
  attendance: [
      // Today
      { id: 'att_1', staff_id: '100001', clock_in_time: daysAgo(0), clock_out_time: null, date: new Date().toISOString().split('T')[0] },
      { id: 'att_2', staff_id: '400004', clock_in_time: daysAgo(0), clock_out_time: null, date: new Date().toISOString().split('T')[0] },
      // Yesterday
      { id: 'att_3', staff_id: '100001', clock_in_time: daysAgo(1), clock_out_time: daysAgo(1), date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
      { id: 'att_4', staff_id: '200002', clock_in_time: daysAgo(1), clock_out_time: daysAgo(1), date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
      { id: 'att_5', staff_id: '500006', clock_in_time: daysAgo(1), clock_out_time: daysAgo(1), date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  ],
  sales: [
    { date: "2025-06-01T00:00:00Z", description: "Sale", cash: 6850, transfer: 19300, pos: 5200, creditSales: 0, shortage: 0, total: 31350 },
    { date: "2025-06-02T00:00:00Z", description: "Sale", cash: 33600, transfer: 18400, pos: 4200, creditSales: 117900, shortage: 0, total: 174100 },
    { date: "2025-06-03T00:00:00Z", description: "Sale", cash: 65400, transfer: 31350, pos: 6900, creditSales: 202900, shortage: 0, total: 306550 }
  ],
  drinkSales: [
    { drinkType: "Fanta", amountPurchases: 4600, quantitySold: 12, sellingPrice: 500, amount: 6000 },
    { drinkType: "CoKe", amountPurchases: 4600, quantitySold: 12, sellingPrice: 500, amount: 6000 },
    { drinkType: "Freshyo", amountPurchases: 6500, quantitySold: 12, sellingPrice: 700, amount: 8400 }
  ],
  debt: [
    { date: "2025-05-31T00:00:00Z", description: "Debtor/Creditor Bal bf", debit: 369500, credit: 300660 },
    { date: "2025-06-30T00:00:00Z", description: "Debtor/Creditor for June", debit: 3715250, credit: 659950 }
  ],
  indirectCosts: [
    { date: "2025-06-02T00:00:00Z", description: "Diesel Generator", category: "Diesel", amount: 73000 },
    { date: "2025-06-02T00:00:00Z", description: "Part payment for Bread Nylon", category: "Nylon", amount: 180000 },
    { date: "2025-06-02T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 30000 },
    { date: "2025-06-03T00:00:00Z", description: "Diesel For production", category: "Diesel", amount: 64800 },
    { date: "2025-06-03T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 30000 },
    { date: "2025-06-04T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 30000 },
    { date: "2025-06-05T00:00:00Z", description: "Sticker Printing", category: "General Expenses", amount: 2500 },
    { date: "2025-06-05T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 35000 },
    { date: "2025-06-06T00:00:00Z", description: "Nylon Completion payment", category: "Nylon", amount: 40000 },
    { date: "2025-06-06T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 25000 },
    { date: "2025-06-06T00:00:00Z", description: "Diesel For production", category: "Diesel", amount: 64800 },
    { date: "2025-06-06T00:00:00Z", description: "Carraige inward", category: "Transportation", amount: 4500 },
    { date: "2025-06-07T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 40000 },
    { date: "2025-06-09T00:00:00Z", description: "Petrol For Generator", category: "Petrol", amount: 9500 },
    { date: "2025-06-09T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 35000 },
    { date: "2025-06-09T00:00:00Z", description: "Car Plug", category: "Repair", amount: 15000 },
    { date: "2025-06-09T00:00:00Z", description: "Advance Salary", category: "Salary", amount: 10000 },
    { date: "2025-06-10T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 20000 },
    { date: "2025-06-11T00:00:00Z", description: "Cleaning Material", category: "Cleaning", amount: 14200 },
    { date: "2025-06-11T00:00:00Z", description: "Market Ticket", category: "General Expenses", amount: 200 },
    { date: "2025-06-11T00:00:00Z", description: "Thank You Bag", category: "General Expenses", amount: 4500 },
    { date: "2025-06-11T00:00:00Z", description: "Petrol For Van and Oil", category: "Petrol", amount: 21000 },
    { date: "2025-06-12T00:00:00Z", description: "Diesel Generator", category: "Diesel", amount: 64800 },
    { date: "2025-06-13T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 30000 },
    { date: "2025-06-14T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 30000 },
    { date: "2025-06-14T00:00:00Z", description: "Distribution Van repair", category: "Repair", amount: 101000 },
    { date: "2025-06-16T00:00:00Z", description: "Police Van Petrol and Entry", category: "General Expenses", amount: 15000 },
    { date: "2025-06-17T00:00:00Z", description: "Cell Phone Memory card", category: "Office Equipment", amount: 31500 },
    { date: "2025-06-17T00:00:00Z", description: "Diesel", category: "Diesel", amount: 70500 },
    { date: "2025-06-18T00:00:00Z", description: "Petrol For Van", category: "Petrol", amount: 35000 },
    { date: "2025-06-18T00:00:00Z", description: "Advance Salary", category: "Salary", amount: 20000 },
    { date: "2025-06-19T00:00:00Z", description: "Petrol For Distribution Van", category: "Petrol", amount: 20000 },
    { date: "2025-06-20T00:00:00Z", description: "Petrol For Distribution Van", category: "Petrol", amount: 20000 },
    { date: "2025-06-20T00:00:00Z", description: "Milk For Baker", category: "General Expenses", amount: 15000 },
    { date: "2025-06-21T00:00:00Z", description: "Face Book Promotion", category: "General Expenses", amount: 11000 },
    { date: "2025-06-21T00:00:00Z", description: "Petrol For Distribution Van", category: "Petrol", amount: 30000 }
  ],
  wages: [
    { name: "Wisdom Effiong Edet", department: "Managerial", position: "Manager", salary: 80000, deductions: { shortages: 0, advanceSalary: 20000 }, netPay: 60000 },
    { name: "MR Bassey OFFIONG", department: "Production", position: "Chief Baker", salary: 60000, deductions: { shortages: 2400, advanceSalary: 10000 }, netPay: 47600 }
  ],
  closingStocks: [
    { item: "Flour", remainingStock: "100KG", amount: 108000 },
    { item: "Yeast", remainingStock: "9 Pack", amount: 27000 },
    { item: "Egg", remainingStock: "75 Pices", amount: 13230 },
    { item: "Oil", remainingStock: "13.53CL", amount: 37030 }
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
                    if ( (key.toLowerCase().includes('date') || key.toLowerCase().includes('timestamp') || key.toLowerCase().includes('at')) && (typeof itemWithTimestamps[key] === 'string' || itemWithTimestamps[key] instanceof Date) && itemWithTimestamps[key]) {
                        const date = new Date(itemWithTimestamps[key]);
                        if (!isNaN(date.getTime())) { 
                           itemWithTimestamps[key] = Timestamp.fromDate(date);
                        }
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
