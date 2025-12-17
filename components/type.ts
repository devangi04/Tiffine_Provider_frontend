// types.ts
export interface Provider {
  _id: string;
  name: string;
  email: string;
  subscription?: {
    status: string;
    plan?: string;
    expiryDate?: Date;
  };
  // Add other properties as needed
}

export interface DashboardStats {
  todaysOrders: number;
  yesCount: number;
  noCount: number;
  // Add other stats as needed
}