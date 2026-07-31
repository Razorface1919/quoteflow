"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function deleteCustomer(customerId: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized access." };
  }

  // RBAC: Prevent regular SALES reps from deleting corporate accounts
  const role = session.user.role as "ADMIN" | "MANAGER" | "SALES";
  if (role !== "ADMIN" && role !== "MANAGER") {
    return { success: false, error: "Only ADMIN or MANAGER roles can delete customers." };
  }

  try {
    // Check for existing quotes to prevent orphan records / FK errors
    const linkedQuotes = await db.quote.count({
      where: { customerId },
    });

    if (linkedQuotes > 0) {
      return {
        success: false,
        error: `Cannot delete company: This customer has ${linkedQuotes} historical quotation(s) attached.`,
      };
    }

    await db.customer.delete({
      where: { id: customerId },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Database error occurred while deleting customer." };
  }
}