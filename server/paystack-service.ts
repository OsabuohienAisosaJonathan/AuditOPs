import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface PaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  amount: number;
  interval: "monthly" | "quarterly" | "annually";
  currency: string;
}

export interface PaystackSubscription {
  id: number;
  subscription_code: string;
  email_token: string;
  status: string;
  next_payment_date: string;
  plan: PaystackPlan;
  customer: PaystackCustomer;
}

export interface PaystackTransaction {
  reference: string;
  status: string;
  amount: number;
  paid_at: string;
  channel: string;
  currency: string;
  customer: PaystackCustomer;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, any>
): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  
  if (!data.status) {
    throw new Error(data.message || "Paystack API error");
  }

  return data.data;
}

export async function createCustomer(
  email: string,
  firstName?: string,
  lastName?: string,
  metadata?: Record<string, any>
): Promise<PaystackCustomer> {
  return paystackRequest<PaystackCustomer>("/customer", "POST", {
    email,
    first_name: firstName,
    last_name: lastName,
    metadata,
  });
}

export async function getCustomer(customerCode: string): Promise<PaystackCustomer> {
  return paystackRequest<PaystackCustomer>(`/customer/${customerCode}`);
}

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  plan?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[];
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  return paystackRequest("/transaction/initialize", "POST", {
    ...params,
    amount: params.amount * 100,
  });
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return paystackRequest<PaystackTransaction>(`/transaction/verify/${reference}`);
}

export async function createSubscription(params: {
  customer: string;
  plan: string;
  start_date?: string;
}): Promise<PaystackSubscription> {
  return paystackRequest<PaystackSubscription>("/subscription", "POST", params);
}

export async function getSubscription(subscriptionCode: string): Promise<PaystackSubscription> {
  return paystackRequest<PaystackSubscription>(`/subscription/${subscriptionCode}`);
}

export async function enableSubscription(params: {
  code: string;
  token: string;
}): Promise<{ status: boolean; message: string }> {
  return paystackRequest("/subscription/enable", "POST", params);
}

export async function disableSubscription(params: {
  code: string;
  token: string;
}): Promise<{ status: boolean; message: string }> {
  return paystackRequest("/subscription/disable", "POST", params);
}

export async function listPlans(): Promise<PaystackPlan[]> {
  return paystackRequest<PaystackPlan[]>("/plan");
}

export async function getPlan(planCode: string): Promise<PaystackPlan> {
  return paystackRequest<PaystackPlan>(`/plan/${planCode}`);
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!PAYSTACK_SECRET_KEY) {
    console.log("[Paystack] No secret key configured, skipping signature verification");
    return true;
  }
  
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  
  return hash === signature;
}

export function calculateExpiryDate(
  currentExpiry: Date | null,
  billingPeriod: "monthly" | "quarterly" | "yearly"
): Date {
  const baseDate = currentExpiry && currentExpiry > new Date() 
    ? new Date(currentExpiry)
    : new Date();
  
  switch (billingPeriod) {
    case "monthly":
      baseDate.setMonth(baseDate.getMonth() + 1);
      break;
    case "quarterly":
      baseDate.setMonth(baseDate.getMonth() + 3);
      break;
    case "yearly":
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      break;
  }
  
  return baseDate;
}

export function calculateNextBillingDate(
  currentExpiry: Date | null,
  billingPeriod: "monthly" | "quarterly" | "yearly"
): Date {
  return calculateExpiryDate(currentExpiry, billingPeriod);
}

export function isPaystackConfigured(): boolean {
  return !!(PAYSTACK_SECRET_KEY && PAYSTACK_PUBLIC_KEY);
}

export function getPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY;
}
