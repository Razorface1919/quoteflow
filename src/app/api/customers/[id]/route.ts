import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.customer.delete({
      where: { id: params.id },
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("CUSTOMER_DELETE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}