export type UserRole = 'seller' | 'shopper' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface SellerProfile extends User {
  role: 'seller';
  storeName: string;
  bio: string;
  categories: string[];
  followers: number;
  rating: number;
}

export interface ShopperProfile extends User {
  role: 'shopper';
  savedAddresses: Address[];
  paymentMethods: PaymentMethod[];
}

export interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  inventory: number;
  images: string[];
  category: string;
  createdAt: string;
}

export interface Livestream {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  status: 'live' | 'scheduled' | 'ended';
  viewerCount: number;
  scheduledAt?: string;
  startedAt?: string;
  products: Product[];
  featuredProductId?: string;
  category: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered';

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  product: Product;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  shippingAddress: Address;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'live' | 'order' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
