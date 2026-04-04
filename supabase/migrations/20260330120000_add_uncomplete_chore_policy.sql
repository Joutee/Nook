-- Allow the assigned user to uncomplete (delete) their chore completion
CREATE POLICY "Only the assignee can uncomplete the chore"
ON "public"."chore_completions"
FOR DELETE TO "authenticated"
USING ("auth"."uid"() = "public"."get_assignee_for_chore_cycle"("chore_id", "cycle_index"));
