-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_dedupeKey_key" ON "Booking"("dedupeKey");
