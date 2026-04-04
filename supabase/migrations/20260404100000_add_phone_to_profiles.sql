-- Add optional phone number to profiles
ALTER TABLE "public"."profiles"
  ADD COLUMN "phone" VARCHAR(20);
