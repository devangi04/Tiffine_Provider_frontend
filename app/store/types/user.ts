// src/types/User.ts
export interface Subscription {
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string; // optional
  subscription: Subscription;
  token: string;
}
