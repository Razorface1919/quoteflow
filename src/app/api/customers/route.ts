import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { companyName, email, preferredCurrency } = body;

    if (!companyName) {
      return new NextResponse("Company Name is required", { status: 400 });
    }

    // Create the organization and automatically nest the email as the primary contact
    const customer = await db.customer.create({
      data: {
        companyName,
        preferredCurrency: preferredCurrency || "INR",
        contacts: email
          ? {
              create: {
                name: "Primary Contact", // Fills the required 'name' field on CustomerContact
                email: email,
                isPrimary: true,
              },
            }
          : undefined,
      },
      include: {
        contacts: true, // Return the newly created contact in the API response
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("CUSTOMER_CREATE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}