-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "recurrenceGroupId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "guidelines" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "mapLink" TEXT;
