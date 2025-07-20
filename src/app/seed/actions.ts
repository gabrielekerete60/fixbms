

"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";

// Helper to create timestamps for recent days
const daysAgo = (days: number) => Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - days)));

const seedData = {
  products: [
      { id: "prod_1", name: "Family Loaf", price: 550.00, stock: 50, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bread loaf', costPrice: 300 },
      { id: "prod_2", name: "Burger Loaf", price: 450.00, stock: 30, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'burger bun', costPrice: 250 },
      { id: "prod_3", name: "Jumbo Loaf", price: 900.00, stock: 25, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'large bread', costPrice: 500 },
      { id: "prod_4", name: "Round Loaf", price: 500.00, stock: 40, category: 'Breads', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'round bread', costPrice: 280 },
      { id: "prod_5", name: "Coca-Cola (50cl)", price: 300.00, stock: 100, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'coca cola', costPrice: 200 },
      { id: "prod_6", name: "Bottled Water (75cl)", price: 150.00, stock: 150, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'bottled water', costPrice: 100 },
      { id: "prod_7", name: "Pepsi (50cl)", price: 300.00, stock: 90, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'pepsi can', costPrice: 200 },
      { id: "prod_8", name: "Sprite (50cl)", price: 300.00, stock: 0, category: 'Drinks', image: "https://placehold.co/150x150.png", 'data-ai-hint': 'sprite can', costPrice: 200 },
  ],
  staff: [
    { staff_id: '100001', name: 'Chris Manager', email: 'chris.manager@example.com', password: 'ManagerPass1!', role: 'Manager', is_active: true, pay_type: 'Salary', pay_rate: 350000, bank_name: "GTBank", account_number: "0123456789", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '200002', name: 'Vic Supervisor', email: 'vic.supervisor@example.com', password: 'SupervisorPass1!', role: 'Supervisor', is_active: true, pay_type: 'Salary', pay_rate: 250000, bank_name: "First Bank", account_number: "1234567890", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '300003', name: 'Favour Accountant', email: 'favour.accountant@example.com', password: 'AccountantPass1!', role: 'Accountant', is_active: true, pay_type: 'Salary', pay_rate: 200000, bank_name: "UBA", account_number: "2345678901", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400004', name: 'Mfon Staff', email: 'mfon.staff@example.com', password: 'StaffPass1!', role: 'Showroom Staff', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Zenith Bank", account_number: "3456789012", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '400005', name: 'Akan Staff', email: 'akan.staff@example.com', password: 'StaffPass1!', role: 'Delivery Staff', is_active: true, pay_type: 'Salary', pay_rate: 80000, bank_name: "Access Bank", account_number: "4567890123", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '500006', name: 'Blessing Baker', email: 'blessing.baker@example.com', password: 'BakerPass1!', role: 'Baker', is_active: true, pay_type: 'Salary', pay_rate: 150000, bank_name: "Wema Bank", account_number: "5678901234", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '600007', name: 'John Cleaner', email: 'john.cleaner@example.com', password: 'CleanerPass1!', role: 'Cleaner', is_active: false, pay_type: 'Hourly', pay_rate: 500, bank_name: "FCMB", account_number: "6789012345", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '700008', name: 'David Storekeeper', email: 'david.storekeeper@example.com', password: 'StorekeeperPass1!', role: 'Storekeeper', is_active: true, pay_type: 'Salary', pay_rate: 100000, bank_name: "Stanbic IBTC", account_number: "7890123456", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
    { staff_id: '000000', name: 'Gabriel Developer', email: 'gabriel.dev@example.com', password: 'DevPassword1!', role: 'Developer', is_active: true, pay_type: 'Salary', pay_rate: 500000, bank_name: "Kuda Bank", account_number: "8901234567", timezone: "Africa/Lagos", mfa_enabled: false, mfa_secret: '' },
  ],
  promotions: [
    { id: "promo_1", name: "Weekend Special", description: "10% off all bread items", type: "percentage", value: 10, code: "WEEKEND10", startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), applicableProducts: [], usageLimit: 100, timesUsed: 12 },
    { id: "promo_2", name: "Free Drink", description: "Buy any 2 loaves, get a free drink", type: "free_item", value: null, code: "DRINKUP", startDate: new Date("2024-05-01").toISOString(), endDate: new Date("2024-05-31").toISOString(), applicableProducts: [], usageLimit: 50, timesUsed: 50 },
    { id: "promo_3", name: "Jumbo Discount", description: "₦100 off Jumbo Loaf", type: "fixed_amount", value: 100, code: "JUMBO100", startDate: new Date().toISOString(), endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), applicableProducts: [{ value: 'prod_3', label: 'Jumbo Loaf' }], usageLimit: 0, timesUsed: 5 },
  ],
  suppliers: [
    { id: "sup_1", name: "Flour Mills of Nigeria", contactPerson: "Mr. Adebayo", phone: "08012345678", email: "sales@fmnplc.com", address: "Apapa, Lagos", amountOwed: 500000, amountPaid: 450000 },
    { id: "sup_2", name: "Dangote Sugar", contactPerson: "Hajiya Bello", phone: "08087654321", email: "sugar@dangote.com", address: "Ikeja, Lagos", amountOwed: 250000, amountPaid: 250000 },
    { id: "sup_3", name: "Local Yeast Supplier", contactPerson: "Mama Chichi", phone: "07011223344", email: "chichisyeast@email.com", address: "Uyo Main Market", amountOwed: 50000, amountPaid: 20000 },
    { id: "sup_4", name: "Packaging Pro", contactPerson: "Mr. Frank", phone: "09012345678", email: "frank@packpro.ng", address: "Ilupeju, Lagos", amountOwed: 15000, amountPaid: 15000 },
    { id: "sup_5", name: "Okomu Oil Palm", contactPerson: "Dr. Evelyn", phone: "08055554444", email: "sales@okomuoil.com", address: "Benin City", amountOwed: 80000, amountPaid: 0 },
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
        name: "Standard Burger Loaf",
        description: "The recipe for our burger loaves.",
        productId: "prod_2",
        productName: "Burger Loaf",
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 0.4, unit: "kg" },
            { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.01, unit: "kg" },
            { ingredientId: "ing_2", ingredientName: "Granulated Sugar", quantity: 0.02, unit: "kg" },
            { ingredientId: "ing_7", ingredientName: "Salt", quantity: 0.005, unit: "kg" },
        ]
     },
     {
        id: "rec_3",
        name: "Standard Jumbo Loaf",
        description: "The recipe for our jumbo loaf.",
        productId: "prod_3",
        productName: "Jumbo Loaf",
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 1, unit: "kg" },
            { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.02, unit: "kg" },
            { ingredientId: "ing_2", ingredientName: "Granulated Sugar", quantity: 0.04, unit: "kg" },
            { ingredientId: "ing_7", ingredientName: "Salt", quantity: 0.01, unit: "kg" },
        ]
     },
     {
        id: "rec_4",
        name: "Standard Round Loaf",
        description: "The recipe for our round loaf.",
        productId: "prod_4",
        productName: "Round Loaf",
        ingredients: [
            { ingredientId: "ing_1", ingredientName: "All-Purpose Flour", quantity: 0.45, unit: "kg" },
            { ingredientId: "ing_6", ingredientName: "Yeast", quantity: 0.01, unit: "kg" },
            { ingredientId: "ing_2", ingredientName: "Granulated Sugar", quantity: 0.02, unit: "kg" },
            { ingredientId: "ing_7", ingredientName: "Salt", quantity: 0.005, unit: "kg" },
        ]
     }
  ],
  ingredients: [
    { id: "ing_1", name: "All-Purpose Flour", stock: 100.00, unit: 'kg', costPerUnit: 500.00, expiryDate: null },
    { id: "ing_2", name: "Granulated Sugar", stock: 50.00, unit: 'kg', costPerUnit: 800.00, expiryDate: null },
    { id: "ing_3", name: "Unsalted Butter", stock: 20.00, unit: 'kg', costPerUnit: 6000.00, expiryDate: null },
    { id: "ing_4", name: "Large Eggs", stock: 200.00, unit: 'pcs', costPerUnit: 50.00, expiryDate: null },
    { id: "ing_5", name: "Whole Milk", stock: 30.00, unit: 'L', costPerUnit: 900.00, expiryDate: null },
    { id: "ing_6", name: "Yeast", stock: 10.00, unit: 'kg', costPerUnit: 2500.00, expiryDate: null },
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
      { id: 'cust_1', name: 'Adebisi Onyeka', phone: '08012345678', email: 'a.onyeka@example.com', address: '123, Allen Avenue, Ikeja', joinedDate: Timestamp.fromDate(new Date('2023-01-15T10:00:00Z')), totalSpent: 150000, amountOwed: 5000, amountPaid: 0 },
      { id: 'cust_2', name: 'Ngozi Okoro', phone: '09087654321', email: 'n.okoro@example.com', address: '45, Lekki Phase 1', joinedDate: Timestamp.fromDate(new Date('2023-02-20T11:30:00Z')), totalSpent: 75000, amountOwed: 0, amountPaid: 75000 },
      { id: 'cust_3', name: 'Chinedu Eze', phone: '07011223344', email: 'c.eze@example.com', address: '78, Surulere, Lagos', joinedDate: Timestamp.fromDate(new Date('2023-03-10T09:00:00Z')), totalSpent: 250000, amountOwed: 20000, amountPaid: 230000 },
      { id: 'cust_4', name: 'Fatima Bello', phone: '08122334455', email: 'f.bello@example.com', address: '10, Garki, Abuja', joinedDate: Timestamp.fromDate(new Date('2023-04-05T14:00:00Z')), totalSpent: 30000, amountOwed: 0, amountPaid: 30000 },
  ],
   orders: [
    {
      id: "ord_1",
      items: [{ id: "prod_1", name: "Family Loaf", price: 550, quantity: 2, costPrice: 300 }],
      total: 1100,
      date: daysAgo(2), // 2 days ago
      paymentMethod: 'Card',
      customerName: 'Adebisi Onyeka',
      customerId: 'cust_1',
      status: 'Completed',
      staffId: '400004'
    },
    {
      id: "ord_2",
      items: [
        { id: "prod_3", name: "Jumbo Loaf", price: 900, quantity: 1, costPrice: 500 },
        { id: "prod_5", name: "Coca-Cola (50cl)", price: 300, quantity: 2, costPrice: 200 },
      ],
      total: 1500,
      date: daysAgo(1), // yesterday
      paymentMethod: 'Cash',
      customerName: 'Ngozi Okoro',
      customerId: 'cust_2',
      status: 'Completed',
      staffId: '400004'
    },
    {
      id: "ord_3",
      items: [{ id: "prod_4", name: "Round Loaf", price: 500, quantity: 10, costPrice: 280 }],
      total: 5000,
      date: daysAgo(3), // 3 days ago
      paymentMethod: 'Card',
      customerName: 'Chinedu Eze',
      customerId: 'cust_3',
      status: 'Completed',
      salesRunId: 'tsr_3_owing',
      staffId: '400005'
    },
     {
      id: "ord_4",
      items: [{ id: "prod_2", name: "Burger Loaf", price: 450, quantity: 5, costPrice: 250 }],
      total: 2250,
      date: Timestamp.now(), // today
      paymentMethod: 'Card',
      customerName: 'Walk-in',
      customerId: 'walk-in',
      status: 'Pending',
      staffId: '400004'
    },
    {
        id: "pc_3_approved",
        items: [{ productId: "prod_1", name: "Family Loaf", price: 550, quantity: 2, costPrice: 300 }],
        total: 1100,
        date: daysAgo(2), // 2 days ago
        paymentMethod: 'Cash',
        customerName: 'Adebisi Onyeka',
        customerId: 'cust_1',
        salesRunId: 'tsr_4_owing',
        staffId: '400005',
        status: 'Completed'
    }
  ],
  supply_logs: [
    { id: 'log_1', supplierId: 'sup_1', supplierName: 'Flour Mills of Nigeria', ingredientId: 'ing_1', ingredientName: 'All-Purpose Flour', quantity: 20, unit: 'kg', costPerUnit: 500, totalCost: 10000, date: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), invoiceNumber: 'FMN-123' },
    { id: 'log_2', supplierId: 'sup_2', supplierName: 'Dangote Sugar', ingredientId: 'ing_2', ingredientName: 'Granulated Sugar', quantity: 10, unit: 'kg', costPerUnit: 800, totalCost: 8000, date: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), invoiceNumber: 'DAN-456' }
  ],
  expenses: [
    { id: 'exp_1', category: 'Utilities', description: 'Monthly electricity bill', amount: 50000, date: Timestamp.fromDate(new Date(new Date().setDate(1))) },
    { id: 'exp_2', category: 'Logistics', description: 'Carriage Inward for flour delivery', amount: 7500, date: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)) },
    { id: 'exp_3', category: 'Salaries', description: 'Monthly staff salaries', amount: 1210000, date: Timestamp.fromDate(new Date(new Date().setDate(28))) },
    { id: 'exp_4', category: 'Maintenance', description: 'Repair of delivery van', amount: 25000, date: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)) }
  ],
  attendance: [
    // Staff 100001 (Manager) - Attended 4 days this week
    { staff_id: '100001', clock_in_time: daysAgo(1), clock_out_time: daysAgo(1), date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] },
    { staff_id: '100001', clock_in_time: daysAgo(2), clock_out_time: daysAgo(2), date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0] },
    { staff_id: '100001', clock_in_time: daysAgo(3), clock_out_time: daysAgo(3), date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0] },
    { staff_id: '100001', clock_in_time: daysAgo(4), clock_out_time: daysAgo(4), date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString().split('T')[0] },
    // Staff 400004 (Showroom) - Attended 5 days
    { staff_id: '400004', clock_in_time: daysAgo(0), clock_out_time: null, date: new Date().toISOString().split('T')[0] },
    { staff_id: '400004', clock_in_time: daysAgo(1), clock_out_time: daysAgo(1), date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] },
    { staff_id: '400004', clock_in_time: daysAgo(2), clock_out_time: daysAgo(2), date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0] },
    { staff_id: '400004', clock_in_time: daysAgo(3), clock_out_time: daysAgo(3), date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0] },
    { staff_id: '400004', clock_in_time: daysAgo(4), clock_out_time: daysAgo(4), date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString().split('T')[0] },
     // Staff 500006 (Baker) - Attended 2 days
    { staff_id: '500006', clock_in_time: daysAgo(1), clock_out_time: daysAgo(1), date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] },
    { staff_id: '500006', clock_in_time: daysAgo(3), clock_out_time: daysAgo(3), date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0] },
  ],
  transfers: [
      { id: "tsr_1_paid", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400005", to_staff_name: "Akan Staff", items: [{ productId: "prod_1", productName: "Family Loaf", quantity: 20 }], date: daysAgo(5), status: 'completed', is_sales_run: true, totalRevenue: 11000, notes: "Morning sales run to Lekki - Paid", totalCollected: 11000, totalOutstanding: 0 },
      { id: "tsr_2_paid", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400005", to_staff_name: "Akan Staff", items: [{ productId: "prod_5", productName: "Coca-Cola (50cl)", quantity: 24 }], date: daysAgo(4), status: 'completed', is_sales_run: true, totalRevenue: 7200, notes: "Drinks for VI - Paid", totalCollected: 7200, totalOutstanding: 0 },
      { id: "tsr_3_owing", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400005", to_staff_name: "Akan Staff", items: [{ productId: "prod_3", productName: "Jumbo Loaf", quantity: 15 }], date: daysAgo(3), status: 'completed', is_sales_run: true, totalRevenue: 13500, notes: "Bulk order for Chinedu Eze - Owing", totalCollected: 0, totalOutstanding: 13500 },
      { id: "tsr_4_owing", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400005", to_staff_name: "Akan Staff", items: [{ productId: "prod_4", productName: "Round Loaf", quantity: 30 }], date: daysAgo(2), status: 'completed', is_sales_run: true, totalRevenue: 15000, notes: "Supply for Adebisi Onyeka's shop - Owing", totalCollected: 1100, totalOutstanding: 13900 },
      { id: "tsr_5_active", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400005", to_staff_name: "Akan Staff", items: [{ productId: "prod_1", productName: "Family Loaf", quantity: 25 }, { productId: "prod_2", productName: "Burger Loaf", quantity: 25 }], date: daysAgo(1), status: 'active', is_sales_run: true, totalRevenue: 25000, notes: "Today's main sales run", totalCollected: 0, totalOutstanding: 25000 },
      { id: "tsr_6_active", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400005", to_staff_name: "Akan Staff", items: [{ productId: "prod_6", productName: "Bottled Water (75cl)", quantity: 48 }], date: Timestamp.now(), status: 'active', is_sales_run: true, totalRevenue: 7200, notes: "Urgent water supply for event", totalCollected: 0, totalOutstanding: 7200 },
      { id: "trans_1", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400004", to_staff_name: "Mfon Staff", items: [{ productId: "prod_1", productName: "Family Loaf", quantity: 12 }], date: daysAgo(2), status: 'completed', is_sales_run: false, totalRevenue: 6600 },
      { id: "trans_2", from_staff_id: "100001", from_staff_name: "Chris Manager", to_staff_id: "400004", to_staff_name: "Mfon Staff", items: [{ productId: "prod_2", productName: "Burger Loaf", quantity: 5 }], date: daysAgo(1), status: 'pending', is_sales_run: false, totalRevenue: 2250 },
  ],
  payment_confirmations: [
      {
        id: "pc_1",
        date: daysAgo(1),
        driverId: "400005",
        driverName: "Akan Staff",
        runId: "tsr_5_active",
        customerId: "cust_3",
        customerName: "Chinedu Eze",
        amount: 2000.00,
        status: "pending",
        isDebtPayment: true,
        items: []
      },
      {
        id: "pc_2",
        date: Timestamp.now(),
        driverId: "400005",
        driverName: "Akan Staff",
        runId: "tsr_5_active",
        customerId: "cust_1",
        customerName: "Adebisi Onyeka",
        amount: 550.00,
        status: "pending",
        isDebtPayment: false,
        items: [{ productId: "prod_1", name: "Family Loaf", price: 550, quantity: 1, costPrice: 300 }]
      },
       {
        id: "pc_3_approved_seed",
        date: daysAgo(2),
        driverId: "400005",
        driverName: "Akan Staff",
        runId: "tsr_4_owing",
        customerId: "cust_1",
        customerName: "Adebisi Onyeka",
        amount: 1100.00,
        status: "approved",
        isDebtPayment: false,
        items: [{ productId: "prod_1", name: "Family Loaf", price: 550, quantity: 2, costPrice: 300 }]
      }
  ],
  announcements: [
    {
      id: "ann_1",
      staffId: "100001",
      staffName: "Chris Manager",
      message: "Team, please remember to clock in and out accurately. Payroll depends on it!",
      timestamp: Timestamp.fromDate(new Date("2024-07-29T13:00:00"))
    },
    {
      id: "ann_2",
      staffId: "200002",
      staffName: "Vic Supervisor",
      message: "We have a large custom cake order due this Friday. All hands on deck!",
      timestamp: Timestamp.fromDate(new Date("2024-07-30T10:00:00"))
    }
  ],
  reports: [
    {
      id: "rep_1",
      subject: "Faulty Oven Door",
      reportType: "Maintenance",
      message: "The door on Oven #2 is not sealing properly. It's losing heat and affecting bake times.",
      staffId: "500006",
      staffName: "Blessing Baker",
      timestamp: Timestamp.fromDate(new Date("2024-07-28T15:00:00")),
      status: "new"
    }
  ],
  waste_logs: [
      {
          id: 'wl_1',
          productId: 'prod_1',
          productName: 'Family Loaf',
          productCategory: 'Breads',
          quantity: 1,
          reason: 'Damaged',
          notes: 'Wrapper was torn during delivery.',
          staffId: '400005',
          staffName: 'Akan Staff',
          date: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      },
      {
          id: 'wl_2',
          productId: 'prod_2',
          productName: 'Burger Loaf',
          productCategory: 'Breads',
          quantity: 2,
          reason: 'Spoiled',
          notes: 'Expired before sale.',
          staffId: '400004',
          staffName: 'Mfon Staff',
          date: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      }
  ],
  production_batches: [
    {
        id: 'batch_1',
        recipeId: 'rec_1',
        recipeName: 'Standard Family Loaf',
        productId: 'prod_1',
        productName: 'Family Loaf',
        requestedById: '500006',
        requestedByName: 'Blessing Baker',
        quantityToProduce: 50,
        status: 'pending_approval',
        createdAt: daysAgo(1),
        ingredients: [
            { ingredientId: 'ing_1', ingredientName: "All-Purpose Flour", quantity: 0.5, unit: "kg" },
            { ingredientId: 'ing_6', ingredientName: "Yeast", quantity: 0.01, unit: "kg" },
        ]
    }
  ],
  personal_stock_mfon: [
    {
        productId: 'prod_1',
        productName: 'Family Loaf',
        stock: 12
    },
    {
        productId: 'prod_2',
        productName: 'Burger Loaf',
        stock: 20
    },
    {
        productId: 'prod_5',
        productName: 'Coca-Cola (50cl)',
        stock: 50
    }
  ],
  personal_stock_akan: [
      { productId: 'prod_1', productName: 'Family Loaf', stock: 50 },
      { productId: 'prod_2', productName: 'Burger Loaf', stock: 20 },
      { productId: 'prod_5', productName: 'Coca-Cola (50cl)', stock: 50 },
      { productId: 'prod_6', productName: 'Bottled Water (75cl)', stock: 100 },
      { productId: 'prod_3', productName: 'Jumbo Loaf', stock: 15 },
      { productId: 'prod_4', productName: 'Round Loaf', stock: 30 },
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
        if (collectionName.startsWith('personal_stock')) continue;

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
                // Convert specific string dates to Timestamps if they are not already
                for (const key of Object.keys(itemWithTimestamps)) {
                    if ( (key.toLowerCase().includes('date') || key.toLowerCase().includes('timestamp')) && typeof itemWithTimestamps[key] === 'string') {
                        const date = new Date(itemWithTimestamps[key]);
                        if (!isNaN(date.getTime())) { // Check if the date is valid
                           itemWithTimestamps[key] = Timestamp.fromDate(date);
                        }
                    }
                }

                batch.set(docRef, itemWithTimestamps);
            });
        }
    }

    // Seed Mfon's personal stock (Showroom Staff)
    seedData.personal_stock_mfon.forEach(item => {
        const docRef = doc(db, "staff/400004/personal_stock", item.productId);
        batch.set(docRef, item);
    });
    
    // Seed Akan's personal stock (Delivery Staff)
    seedData.personal_stock_akan.forEach(item => {
        const docRef = doc(db, "staff/400005/personal_stock", item.productId);
        batch.set(docRef, item);
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

async function clearSubcollections(collectionPath: string, batch: writeBatch) {
    const mainCollectionSnapshot = await getDocs(collection(db, collectionPath));
    for (const mainDoc of mainCollectionSnapshot.docs) {
        // Clear 'personal_stock' subcollection for staff
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
    const collectionsToClear = Object.keys(seedData).filter(k => !k.startsWith('personal_stock'));

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
  console.log("Attempting to seed empty collections...");
  const collectionsToCreate = Object.keys(seedData).filter(k => !k.startsWith('personal_stock'));
  
  try {
    for (const collectionName of collectionsToCreate) {
      const placeholderRef = doc(collection(db, collectionName), '__placeholder__');
      const batch = writeBatch(db);
      batch.set(placeholderRef, { exists: true });
      batch.delete(placeholderRef);
      await batch.commit();
      console.log(`Created empty collection: ${collectionName}`);
    }
    console.log("Empty collections created successfully.");
    return { success: true };
  } catch (error) {
    console.error("Error seeding empty collections:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to seed empty collections: ${errorMessage}` };
  }
}

type ActionResult = {
  success: boolean;
  error?: string;
};
