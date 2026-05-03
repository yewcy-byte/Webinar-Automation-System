import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase server env vars");
      return Response.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { access_token } = body;

    if (!access_token) {
      return Response.json({ error: "Missing access_token" }, { status: 400 });
    }

    const { data, error } = await supabaseServer.auth.getUser(access_token);

    if (error || !data?.user) {
      return Response.json({ error: error?.message || "Invalid token" }, { status: 401 });
    }

    return Response.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    console.error("/api/auth/session error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
