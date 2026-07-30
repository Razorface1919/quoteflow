/*
  Warnings:

  - You are about to drop the column `marginPercent` on the `LineItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitCost` on the `LineItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[quoteNumber,version]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `listPrice` to the `LineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteStatus" ADD VALUE 'UNDER_NEGOTIATION';
ALTER TYPE "QuoteStatus" ADD VALUE 'ORDER_PLACED';
ALTER TYPE "QuoteStatus" ADD VALUE 'CLOSED_WON';
ALTER TYPE "QuoteStatus" ADD VALUE 'CLOSED_LOST';
ALTER TYPE "QuoteStatus" ADD VALUE 'EXPIRED';

-- DropIndex
DROP INDEX "Quote_quoteNumber_key";

-- AlterTable
ALTER TABLE "LineItem" DROP COLUMN "marginPercent",
DROP COLUMN "unitCost",
ADD COLUMN     "discountAmount" DECIMAL(20,4) NOT NULL DEFAULT 0.0000,
ADD COLUMN     "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "listPrice" DECIMAL(20,4) NOT NULL,
ADD COLUMN     "overrideReason" TEXT,
ALTER COLUMN "leadTimeDays" SET DEFAULT 14;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_quoteId_idx" ON "ActivityLog"("quoteId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_version_key" ON "Quote"("quoteNumber", "version");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
