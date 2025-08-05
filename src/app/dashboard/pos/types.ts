
export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  'data-ai-hint': string;
  costPrice?: number;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type CompletedOrder = {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  paymentMethod: 'POS' | 'Cash' | 'Paystack' | 'Credit';
  customerName?: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
};

export type User = {
  name: string;
  role: string;
  staff_id: string;
  email: string;
};

export type SelectableStaff = {
    staff_id: string;
    name: string;
    role: string;
};

export type PaymentStatus = {
    status: 'idle' | 'processing' | 'success' | 'failed' | 'cancelled';
    orderId?: string | null;
    message?: string;
}

export type PaystackTransaction = {
    message: string;
    reference: string;
    status: 'success' | 'abandoned';
    trans: string;
    transaction: string;
    trxref: string;
}
