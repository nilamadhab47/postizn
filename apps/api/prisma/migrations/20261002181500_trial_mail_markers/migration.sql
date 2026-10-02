-- Trial reminder markers so 3-day / 1-day mail is sent once.
ALTER TABLE "User" ADD COLUMN "trialReminded3dAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "trialReminded1dAt" TIMESTAMP(3);
