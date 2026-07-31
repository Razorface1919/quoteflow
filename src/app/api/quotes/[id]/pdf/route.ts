import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // <-- Next.js 15+ requires params to be a Promise
) {
  // 1. Await params first so 'id' is defined!
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Verify quote exists using the awaited 'id'
    const quote = await db.quote.findUnique({
      where: { id: id },
      select: { quoteNumber: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // 3. Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 4. Pass auth cookies from the incoming request so Puppeteer is "logged in"
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader
      .split("; ")
      .filter(Boolean)
      .map((c) => {
        const [name, ...val] = c.split("=");
        return {
          name: name.trim(),
          value: val.join("=").trim(),
          domain: "localhost",
          path: "/",
        };
      });

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    // 5. Navigate to the clean print page using the awaited 'id'
    const printUrl = `http://localhost:3000/quotes/${id}/print`;
    await page.goto(printUrl, {
      waitUntil: "domcontentloaded", // <-- Avoids Next.js dev WebSocket timeouts!
    });

    // 6. Generate A4 PDF buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "20mm",
        right: "20mm",
      },
    });

    await browser.close();

    // 7. Return PDF with explicit headers to force download or browser preview
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF document" },
      { status: 500 }
    );
  }
}