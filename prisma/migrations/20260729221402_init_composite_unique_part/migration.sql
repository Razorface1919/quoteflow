-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "mouserPartNumber" TEXT,
    "manufacturer" TEXT NOT NULL,
    "manufacturerPartNum" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT 'No description provided.',
    "category" TEXT NOT NULL DEFAULT 'Integrated Circuits (ICs)',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "dataSheetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Part_manufacturer_manufacturerPartNum_key" ON "Part"("manufacturer", "manufacturerPartNum");
