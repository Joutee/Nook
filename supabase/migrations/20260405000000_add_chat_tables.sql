-- Messages table
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flat_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL CHECK (char_length("content") > 0),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_messages_flat_created" ON "public"."messages" ("flat_id", "created_at" DESC);

-- Message reads table (one row per user per flat)
CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "profile_id" "uuid" NOT NULL,
    "flat_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("profile_id", "flat_id"),
    CONSTRAINT "message_reads_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "message_reads_flat_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;

-- Messages: SELECT — user must be active member of the flat
CREATE POLICY "Users can view messages in their flat"
ON "public"."messages" FOR SELECT TO "authenticated"
USING (EXISTS (
    SELECT 1 FROM "public"."flat_profile" "fp"
    WHERE "fp"."flat_id" = "messages"."flat_id"
    AND "fp"."profile_id" = "auth"."uid"()
    AND "fp"."active" = true
));

-- Messages: INSERT — user must be active member + sender_id must be self
CREATE POLICY "Users can send messages in their flat"
ON "public"."messages" FOR INSERT TO "authenticated"
WITH CHECK (
    "sender_id" = "auth"."uid"()
    AND EXISTS (
        SELECT 1 FROM "public"."flat_profile" "fp"
        WHERE "fp"."flat_id" = "messages"."flat_id"
        AND "fp"."profile_id" = "auth"."uid"()
        AND "fp"."active" = true
    )
);

-- Message reads: SELECT — user can see reads for flats they belong to
CREATE POLICY "Users can view read receipts in their flat"
ON "public"."message_reads" FOR SELECT TO "authenticated"
USING (EXISTS (
    SELECT 1 FROM "public"."flat_profile" "fp"
    WHERE "fp"."flat_id" = "message_reads"."flat_id"
    AND "fp"."profile_id" = "auth"."uid"()
    AND "fp"."active" = true
));

-- Message reads: INSERT — user can only insert their own read receipt
CREATE POLICY "Users can insert their own read receipts"
ON "public"."message_reads" FOR INSERT TO "authenticated"
WITH CHECK ("profile_id" = "auth"."uid"());

-- Message reads: UPDATE — user can only update their own read receipt
CREATE POLICY "Users can update their own read receipts"
ON "public"."message_reads" FOR UPDATE TO "authenticated"
USING ("profile_id" = "auth"."uid"())
WITH CHECK ("profile_id" = "auth"."uid"());

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."messages";
