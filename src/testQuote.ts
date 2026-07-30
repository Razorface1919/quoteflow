import { db } from "./lib/db";
import { createQuote, reviseQuote } from "./app/actions/quotes";

async function runQuoteTest() {
  console.log("==========================================");
  console.log("   QUOTEFLOW - TASK 3 & 4 AUDIT SUITE    ");
  console.log("==========================================\n");

  try {
    // 1. Fetch test customer & sales user
    const customer = await db.customer.findFirst({
      where: { companyName: { contains: "Bharat Aerospace" } },
    });
    if (!customer) throw new Error("Bharat Aerospace customer not found in DB.");

    const salesUser = await db.user.findUnique({
      where: { email: "sales@quoteflow.io" },
    });
    if (!salesUser) throw new Error("sales@quoteflow.io user not found in DB.");

    const catalogParts = await db.part.findMany({ take: 2 });
    if (catalogParts.length < 2) throw new Error("Catalog needs at least 2 parts.");

    // 2. Create Initial Quote (v1)
    console.log("🚀 Creating Initial Quote (v1)...");
    const v1Quote = await createQuote({
      customerId: customer.id,
      createdById: salesUser.id,
      discountPercent: 5.0,
      taxRate: 18.0,
      notes: "Original v1 Proposal",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        { partId: catalogParts[0].id, quantity: 10, marginPercent: 20.0 },
      ],
    });

    console.log(`✅ Quote Created: ${v1Quote.quoteNumber} (v${v1Quote.version}) - Status: ${v1Quote.status}`);
    console.log(`   v1 Total Amount: $${v1Quote.totalAmount}`);

    // 3. Create Revision (v2) - Modifying quantity and discount
    console.log("\n🔄 Executing reviseQuote Action (Creating v2)...");
    const { previousQuote, newQuote } = await reviseQuote({
      quoteId: v1Quote.id,
      updatedById: salesUser.id,
      discountPercent: 10.0, // Increased discount from 5% to 10%
      notes: "Revised v2 Proposal - Client negotiated 10% discount",
      items: [
        { partId: catalogParts[0].id, quantity: 25, marginPercent: 20.0 }, // Increased quantity from 10 to 25
        { partId: catalogParts[1].id, quantity: 5, marginPercent: 15.0 },  // Added second line item
      ],
    });

    console.log("\n================ REVISION COMPARISON AUDIT ================");
    console.log(`Quote Reference Number: ${newQuote.quoteNumber}\n`);

    console.table([
      {
        "Version": `v${previousQuote.version}`,
        "DB ID": previousQuote.id,
        "Status": previousQuote.status,
        "Discount %": `${previousQuote.discountPercent}%`,
        "Total Amount": `$${previousQuote.totalAmount}`,
      },
      {
        "Version": `v${newQuote.version}`,
        "DB ID": newQuote.id,
        "Status": newQuote.status,
        "Discount %": `${newQuote.discountPercent}%`,
        "Total Amount": `$${newQuote.totalAmount}`,
      },
    ]);

    console.log("\n------------- v2 LINE ITEMS (EXPANDED SNAPSHOT) -------------");
    console.table(
      newQuote.lineItems.map((li) => ({
        "MPN": li.partNumber,
        "Qty": li.quantity,
        "Unit Cost": Number(li.unitCost),
        "Unit Price": Number(li.unitPrice),
        "Line Total": Number(li.totalPrice),
      }))
    );

    console.log("==========================================");
    console.log("  🎉 TASK 4 REVISION AUDIT PASSED!       ");
    console.log("==========================================\n");

  } catch (error: any) {
    console.error("\n❌ Quote Audit Failed:", error.message);
  } finally {
    await db.$disconnect();
  }
}

runQuoteTest();