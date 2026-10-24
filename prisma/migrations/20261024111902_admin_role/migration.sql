-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT;

-- AddCheckConstraints
-- Only the admin command sets a role, and `admin` is the only one there is.
ALTER TABLE "User"
ADD CONSTRAINT "User_role_known" CHECK ("role" IS NULL OR "role" = 'admin');
