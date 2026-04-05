import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `Jsi asistent pro čtení účtenek z obchodů. Analyzuj obrázek účtenky a vrať POUZE validní JSON bez jakéhokoli dalšího textu.

Pravidla:
- Extrahuj POUZE řádkové položky nákupu (produkty/zboží)
- Ignoruj: DPH řádky, mezisoučty, platební metody, DIČ, IČO, zákaznické karty, slevy jako samostatné řádky (slevu zahrň do ceny položky)
- Pokud má položka množství (např. "3x 2,90"), uveď celkovou cenu (8,70)
- Ceny převeď na čísla (ne stringy)
- Datum ve formátu ISO (YYYY-MM-DD)
- Pokud něco nedokážeš přečíst, vynech to
- Pokud obrázek není účtenka, vrať {"error": "not_a_receipt"}

Formát odpovědi:
{
  "store_name": "Název obchodu nebo null",
  "date": "YYYY-MM-DD nebo null",
  "items": [
    {"name": "Název položky", "price": 12.90}
  ],
  "total": 123.45
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: image_base64,
                  },
                },
                {
                  type: "text",
                  text: "Přečti tuto účtenku a vrať JSON s položkami.",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const anthropicData = await anthropicResponse.json();
    const textContent = anthropicData.content?.find(
      (c: { type: string }) => c.type === "text",
    );

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse the JSON from Claude's response — strip markdown fences if present
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
