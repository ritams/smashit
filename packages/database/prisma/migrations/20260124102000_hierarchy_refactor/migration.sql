/*
  Warnings:

  - You are about to drop the column `spaceId` on the `BookingRules` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `guidelines` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrls` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `mapLink` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Space` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[facilityId]` on the table `BookingRules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `facilityId` to the `BookingRules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `facilityId` to the `Space` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BookingRules" DROP CONSTRAINT "BookingRules_spaceId_fkey";

-- DropIndex
DROP INDEX "BookingRules_spaceId_key";

-- AlterTable
ALTER TABLE "BookingRules" ALTER COLUMN "spaceId" DROP NOT NULL,
ADD COLUMN     "facilityId" TEXT;

-- AlterTable
ALTER TABLE "Space" -- DROP COLUMN "description",
-- DROP COLUMN "guidelines",
-- DROP COLUMN "imageUrls",
-- DROP COLUMN "location",
-- DROP COLUMN "mapLink",
-- DROP COLUMN "type",
ADD COLUMN     "facilityId" TEXT;

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERIC',
    "location" TEXT,
    "mapLink" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guidelines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_orgId_idx" ON "Facility"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRules_facilityId_key" ON "BookingRules"("facilityId");

-- CreateIndex
CREATE INDEX "Space_facilityId_idx" ON "Space"("facilityId");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRules" ADD CONSTRAINT "BookingRules_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
