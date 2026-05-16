-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "dueAt" TIMESTAMP(3);
