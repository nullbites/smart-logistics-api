-- CreateTable
CREATE TABLE "NetworkPeakWindow" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "NetworkPeakWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworkPeakWindow_networkId_idx" ON "NetworkPeakWindow"("networkId");

-- AddForeignKey
ALTER TABLE "NetworkPeakWindow" ADD CONSTRAINT "NetworkPeakWindow_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

