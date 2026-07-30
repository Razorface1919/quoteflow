"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

export interface CustomerInput {
  companyName: string;
  gstin?: string;
  billingAddress?: any;
  shippingAddress?: any;
  paymentTerms?: string;
  preferredCurrency: string;
  contacts: ContactInput[];
}

export async function upsertCustomer(data: CustomerInput, customerId?: string) {
  // 1. Enforce that at least one contact exists and exactly ONE is marked primary
  if (!data.contacts || data.contacts.length === 0) {
    throw new Error("A customer must have at least one contact person.");
  }

  const primaryCount = data.contacts.filter((c) => c.isPrimary).length;
  if (primaryCount === 0) {
    // Default the first contact to primary if none selected
    data.contacts[0].isPrimary = true;
  } else if (primaryCount > 1) {
    throw new Error("Only one contact person can be marked as primary.");
  }

  // 2. Perform DB Mutation
  if (customerId) {
    const updated = await db.customer.update({
      where: { id: customerId },
      data: {
        companyName: data.companyName,
        gstin: data.gstin,
        billingAddress: data.billingAddress || {},
        shippingAddress: data.shippingAddress || {},
        paymentTerms: data.paymentTerms || "NET30",
        preferredCurrency: data.preferredCurrency || "INR",
        contacts: {
          deleteMany: {}, // Clean replace of contacts
          create: data.contacts,
        },
      },
      include: { contacts: true },
    });
    revalidatePath("/customers");
    return updated;
  } else {
    const created = await db.customer.create({
      data: {
        companyName: data.companyName,
        gstin: data.gstin,
        billingAddress: data.billingAddress || {},
        shippingAddress: data.shippingAddress || {},
        paymentTerms: data.paymentTerms || "NET30",
        preferredCurrency: data.preferredCurrency || "INR",
        contacts: {
          create: data.contacts,
        },
      },
      include: { contacts: true },
    });
    revalidatePath("/customers");
    return created;
  }
}

export async function getCustomers() {
  return await db.customer.findMany({
    include: { contacts: true },
    orderBy: { companyName: "asc" },
  });
}