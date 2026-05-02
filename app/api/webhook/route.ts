const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "yewToken";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hubMode = url.searchParams.get("hub.mode");
  const hubVerifyToken = url.searchParams.get("hub.verify_token");
  const hubChallenge = url.searchParams.get("hub.challenge");

  if (hubMode === "subscribe" && hubVerifyToken === VERIFY_TOKEN) {
    return new Response(hubChallenge, { status: 200 });
  }

  return new Response("Unauthorized", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("WhatsApp Webhook Payload:", JSON.stringify(body, null, 2));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
