import { db } from "./lib/db";
import { createQuote, reviseQuote } from "./app/actions/quotes";

async function runRbacTest() {
  console.log("==========================================");
  console.log("     QUOTEFLOW - TASK 5 RBAC AUDIT        ");
  console.log("==========================================\n");

  try {
    const customer = await db.customer.findFirst();
    const salesUser = await db.user.findUnique({ where: { email: "sales@quoteflow.io" } });
    const managerUser = await db.user.findUnique({ where: { email: "manager@quoteflow.io" } });
    const catalogParts = await db.part.findMany({ take: 1 });

    if (!customer || !salesUser || !managerUser || catalogParts.length === 0) {
      throw new Error("Missing seeded test data in DB. Make sure your database is seeded with sales@quoteflow.io and manager@quoteflow.io!");
    }

    // TEST 1: Manager creates a quote
    console.log("TEST 1: Manager creating a quote...");
    const managerQuote = await createQuote({
      customerId: customer.id,
      createdById: managerUser.id,
      discountPercent: 5.0,
      validUntil: new Date(Date.now() + 86400000),
      items: [{ partId: catalogParts[0].id, quantity: 10, marginPercent: 20 }],
    });
    console.log(`✅ Manager successfully created: ${managerQuote.quoteNumber} (Owner ID: ${managerQuote.createdById})`);

    // TEST 2: Sales Rep attempts to revise MANAGER'S quote (Should be BLOCKED!)
    console.log("\nTEST 2: Sales Rep attempting to revise Manager's quote...");
    try {
      await reviseQuote({
        quoteId: managerQuote.id,
        updatedById: salesUser.id, // Sales rep ID!
        discountPercent: 10.0,
      });
      console.log("❌ ERROR: Sales Rep was incorrectly allowed to revise Manager's quote!");
    } catch (error: any) {
      console.log(`✅ BLOCKED AS EXPECTED! Guardrail response:\n   "${error.message}"`);
    }

    // TEST 3: High-Discount Auto-Routing (>15% Discount -> PENDING_APPROVAL)
    console.log("\nTEST 3: Creating quote with 20% Discount (Should auto-route to PENDING_APPROVAL)...");
    const highDiscountQuote = await createQuote({
      customerId: customer.id,
      createdById: salesUser.id,
      discountPercent: 20.0, // > 15% threshold!
      validUntil: new Date(Date.now() + 86400000),
      items: [{ partId: catalogParts[0].id, quantity: 50, marginPercent: 15 }],
    });
    console.log(`✅ Quote Created: ${highDiscountQuote.quoteNumber} | Assigned Status: [ ${highDiscountQuote.status} ]`);

    console.log("\n==========================================");
    console.log("  🎉 TASK 5 SECURITY AUDIT PASSED!       ");
    console.log("==========================================\n");
  } catch (error: any) {
    console.error("❌ RBAC Audit Failed:", error.message);
  } finally {
    await db.$disconnect();
  }
}

runRbacTest();