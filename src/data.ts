/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Transaction, Asset, ForecastScenario, Budget } from "./types";

export const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80";

export const INITIAL_USER: User = {
  email: "alex.carter@wealthflow.com",
  name: "Alex Carter",
  avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
  currency: "USD",
  language: "English",
  theme: "Light",
  pushNotifications: true,
  emailAlerts: false,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    merchant: "Sweetgreen",
    amount: -18.50,
    category: "Food & Dining",
    date: new Date().toISOString().split("T")[0], // Today
    time: "12:30 PM",
    paymentMethod: "Chase Visa",
    type: "expense"
  },
  {
    id: "tx-2",
    merchant: "Uber Ride",
    amount: -24.00,
    category: "Travel",
    date: new Date().toISOString().split("T")[0], // Today
    time: "08:45 AM",
    paymentMethod: "Amex Platinum",
    type: "expense"
  },
  {
    id: "tx-3",
    merchant: "Starbucks",
    amount: -5.40,
    category: "Food & Dining",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // Yesterday
    time: "03:15 PM",
    paymentMethod: "Chase Visa",
    type: "expense"
  },
  {
    id: "tx-4",
    merchant: "Whole Foods",
    amount: -142.30,
    category: "Food & Dining",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // Yesterday
    time: "06:15 PM",
    paymentMethod: "Chase Visa",
    type: "expense"
  },
  {
    id: "tx-5",
    merchant: "Salary Deposit",
    amount: 4250.00,
    category: "Salary",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // Yesterday
    time: "09:00 AM",
    paymentMethod: "Checking Acct",
    type: "income"
  },
  {
    id: "tx-6",
    merchant: "Downtown Apartments",
    amount: -2400.00,
    category: "Rent",
    date: new Date(Date.now() - 345600000).toISOString().split("T")[0], // 4 Days ago
    time: "10:00 AM",
    paymentMethod: "Checking Acct",
    type: "expense"
  },
  {
    id: "tx-7",
    merchant: "Tech Corp Inc.",
    amount: 8500.00,
    category: "Salary",
    date: new Date(Date.now() - 432000000).toISOString().split("T")[0], // 5 Days ago
    time: "08:00 AM",
    paymentMethod: "Checking Acct",
    type: "income"
  }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: "ast-1",
    name: "Stocks",
    ticker: "STK",
    type: "Stocks",
    allocationPercent: 45,
    value: 561825,
    count: 240, // Apple Inc as placeholder AAPL shares for high holding
    countLabel: "AAPL • 240 Shares",
    changePercent: 2.9,
    changeType: "up",
    sparkline: [40000, 41200, 40800, 41900, 42500]
  },
  {
    id: "ast-2",
    name: "Crypto",
    ticker: "BTC",
    type: "Crypto",
    allocationPercent: 20,
    value: 249700,
    count: 1.5,
    countLabel: "BTC • 1.5 Coins",
    changePercent: 4.8,
    changeType: "up",
    sparkline: [92000, 94100, 93000, 96500, 98000]
  },
  {
    id: "ast-3",
    name: "Real Estate",
    ticker: "VNQ",
    type: "Real Estate",
    allocationPercent: 20,
    value: 249700,
    count: 1200,
    countLabel: "VNQ • 1200 Shares",
    changePercent: 0.3,
    changeType: "down",
    sparkline: [103000, 102800, 102900, 102500, 102400]
  },
  {
    id: "ast-4",
    name: "Cash",
    ticker: "USD",
    type: "Cash",
    allocationPercent: 10,
    value: 124850,
    count: 124850,
    countLabel: "Cash Reserves",
    changePercent: 0.0,
    changeType: "up",
    sparkline: [124850, 124850, 124850, 124850, 124850]
  },
  {
    id: "ast-5",
    name: "Gold",
    ticker: "GLD",
    type: "Gold",
    allocationPercent: 5,
    value: 62425,
    count: 25,
    countLabel: "GLD • 25 Ounces",
    changePercent: 1.2,
    changeType: "up",
    sparkline: [61000, 61500, 61200, 62000, 62425]
  }
];

export const INITIAL_BUDGET: Budget = {
  limit: 5000,
  spent: 4200,
  subBudgets: [
    { category: "Food & Dining", limit: 1000 },
    { category: "Rent", limit: 2500 },
    { category: "Travel", limit: 600 },
    { category: "Shopping", limit: 500 },
    { category: "Utilities", limit: 300 },
    { category: "Miscellaneous", limit: 100 }
  ]
};

export const INITIAL_SCENARIOS: ForecastScenario[] = [
  {
    id: "sc-1",
    name: "Default Dynamic Path",
    monthlyContribution: 1500,
    expectedYield: 7.5,
    timeHorizon: 20,
    totalContributions: 360000,
    estimatedReturns: 885600,
    estimatedFutureWealth: 1245600,
    dateCreated: new Date().toISOString().split("T")[0]
  }
];

// Helper to load or initialize user data from localStorage
export function loadUserData(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const storageKey = `fintrack_user_${cleanEmail}`;
  const existing = localStorage.getItem(storageKey);

  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {
      console.error("Error parsing user data", e);
    }
  }

  // Generate new data
  const userObj = {
    user: cleanEmail === INITIAL_USER.email.toLowerCase() ? INITIAL_USER : {
      ...INITIAL_USER,
      email: cleanEmail,
      name: cleanEmail.split("@")[0].replace(/^\w/, c => c.toUpperCase()) + " User"
    },
    transactions: INITIAL_TRANSACTIONS,
    assets: INITIAL_ASSETS,
    budget: INITIAL_BUDGET,
    scenarios: INITIAL_SCENARIOS
  };

  localStorage.setItem(storageKey, JSON.stringify(userObj));
  return userObj;
}

// Helper to save user data
export function saveUserData(email: string, data: {
  user: User;
  transactions: Transaction[];
  assets: Asset[];
  budget: Budget;
  scenarios: ForecastScenario[];
}) {
  const cleanEmail = email.toLowerCase().trim();
  const storageKey = `fintrack_user_${cleanEmail}`;
  localStorage.setItem(storageKey, JSON.stringify(data));
}
