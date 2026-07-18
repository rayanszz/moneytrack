import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { User, Transaction, Asset, ForecastScenario, Budget } from "./types";
import { INITIAL_USER, INITIAL_TRANSACTIONS, INITIAL_ASSETS, INITIAL_BUDGET, INITIAL_SCENARIOS } from "./data";

export async function loadUserDataFromFirestore(userId: string, email: string) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    const user = {
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl || "",
      currency: data.currency || "USD",
      language: data.language || "English",
      theme: data.theme || "Light",
      pushNotifications: data.pushNotifications || false,
      emailAlerts: data.emailAlerts || false,
    } as User;

    const budget = {
      limit: data.budgetLimit || 5000,
      spent: data.budgetSpent || 0,
    } as Budget;

    const txSnap = await getDocs(collection(db, "users", userId, "transactions"));
    const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
    
    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const assetsSnap = await getDocs(collection(db, "users", userId, "assets"));
    const assets = assetsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Asset[];

    const scenariosSnap = await getDocs(collection(db, "users", userId, "scenarios"));
    const scenarios = scenariosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ForecastScenario[];

    return { user, budget, transactions, assets, scenarios };
  } else {
    // Initialize new user
    const batch = writeBatch(db);

    const newUser = {
      ...INITIAL_USER,
      email: email,
      name: email.split("@")[0].replace(/^\w/, (c: string) => c.toUpperCase()) + " User"
    };

    batch.set(userRef, {
      name: newUser.name,
      email: newUser.email,
      avatarUrl: newUser.avatarUrl,
      theme: newUser.theme,
      currency: newUser.currency,
      language: newUser.language,
      pushNotifications: newUser.pushNotifications,
      emailAlerts: newUser.emailAlerts,
      budgetLimit: INITIAL_BUDGET.limit,
      budgetSpent: 0,
    });

    await batch.commit();

    return {
      user: newUser,
      budget: { limit: INITIAL_BUDGET.limit, spent: 0 },
      transactions: [],
      assets: [],
      scenarios: []
    };
  }
}

export async function saveUserSettingToFirestore(userId: string, user: User, budget: Budget) {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    theme: user.theme,
    currency: user.currency,
    language: user.language,
    pushNotifications: user.pushNotifications,
    emailAlerts: user.emailAlerts,
    budgetLimit: budget.limit,
    budgetSpent: budget.spent,
  }, { merge: true });
}

export async function addTransactionToFirestore(userId: string, tx: Transaction) {
  const { id, ...data } = tx;
  const ref = doc(collection(db, "users", userId, "transactions"), id);
  await setDoc(ref, data);
}

export async function updateAssetInFirestore(userId: string, asset: Asset) {
  const { id, ...data } = asset;
  const ref = doc(collection(db, "users", userId, "assets"), id);
  await setDoc(ref, data);
}

export async function addScenarioToFirestore(userId: string, sc: ForecastScenario) {
  const { id, ...data } = sc;
  const ref = doc(collection(db, "users", userId, "scenarios"), id);
  await setDoc(ref, data);
}

export async function deleteScenarioFromFirestore(userId: string, scenarioId: string) {
  const { deleteDoc } = await import("firebase/firestore");
  const ref = doc(collection(db, "users", userId, "scenarios"), scenarioId);
  await deleteDoc(ref);
}

// And for deletion, etc, if needed.
