/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  email: string;
  name: string;
  avatarUrl?: string;
  currency: string;
  language: string;
  theme: 'Light' | 'Dark';
  pushNotifications: boolean;
  emailAlerts: boolean;
}

export interface Transaction {
  id: string;
  merchant: string;
  amount: number; // positive for income, negative for expense
  category: string; // e.g. 'Food & Dining', 'Rent', 'Salary', 'Shopping', 'Travel', 'Utilities'
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  paymentMethod: string; // e.g. 'Chase Visa', 'Amex Platinum', 'Checking Acct'
  type: 'income' | 'expense';
  items?: string[];
  notes?: string;
}

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  type: 'Stocks' | 'Crypto' | 'Real Estate' | 'Cash' | 'Gold';
  allocationPercent: number; // e.g. 45
  value: number; // current value in USD
  count?: number; // e.g. 240 shares or 1.5 coins
  countLabel?: string; // e.g. "Shares" or "Coins"
  changePercent?: number; // e.g. 2.9
  changeType?: 'up' | 'down';
  sparkline?: number[]; // 5 values e.g. [10, 20, 15, 30, 50]
}

export interface ForecastScenario {
  id: string;
  name: string;
  monthlyContribution: number;
  expectedYield: number;
  timeHorizon: number;
  totalContributions: number;
  estimatedReturns: number;
  estimatedFutureWealth: number;
  dateCreated: string;
}

export interface SubBudget {
  category: string;
  limit: number;
}

export interface Budget {
  limit: number;
  spent: number;
  subBudgets?: SubBudget[];
}
