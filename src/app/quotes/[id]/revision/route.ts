// src/app/api/quotes/[id]/revision/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Fetch the existing quote with its line items
    const existing = await db.quote.findUnique({
      where: { id: params.id },
      include: { lineItems: true },
    });

    if (!existing) {
      return new NextResponse("Quote not found", { status: 404 });
    }

    // 2. Clone into a new revision
    const newRevision = await db.quote.create({
      data: {
        quoteNumber: existing.quoteNumber,
        version: existing.version + 1,
        status: "DRAFT",
        customerId: existing.customerId,
        createdById: session.user.id,
        validUntil: existing.validUntil,
        subtotal: existing.subtotal,
        taxRate: existing.taxRate,
        totalAmount: existing.totalAmount,
        lineItems: {
          create: existing.lineItems.map((item) => ({
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            listPrice: item.listPrice,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
    });

    return NextResponse.json(newRevision);
  } catch (error) {
    console.error("REVISION_CREATE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}