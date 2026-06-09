import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://duo-oc.com",
  "https://duo-oc.vercel.app",
  "http://localhost:5173",
]);

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

type PushRequest = {
  notificationId: string;
};

// Notification types this function is allowed to deliver a push for.
const SUPPORTED_TYPES = new Set([
  "homie_request",
  "homie_accepted",
  "hangout_request",
  "hangout_accepted",
  "hangout_confirmed",
  "match",
  "solo_request",
  "solo_accepted",
  "plan_proposed",
  "plan_confirmed",
  "plan_guest_invited",
  "plan_guest_accepted",
  "plan_guest_declined",
]);

const PUSH_TITLES: Record<string, string> = {
  homie_request: "New duo request",
  homie_accepted: "You're now a duo!",
  hangout_request: "New hangout request",
  hangout_accepted: "Hangout confirmed",
  hangout_confirmed: "Hangout confirmed",
  match: "It's a match!",
  solo_request: "New 1:1 request",
  solo_accepted: "It's a match! 🎉",
  plan_proposed: "New plan suggestion",
  plan_confirmed: "Plan confirmed",
  plan_guest_invited: "You're invited as a +1",
  plan_guest_accepted: "Your +1 is coming",
  plan_guest_declined: "Your +1 declined",
};

const PUSH_BODIES: Record<string, string> = {
  homie_request: "Someone wants to be your duo partner.",
  homie_accepted: "Your homie request was accepted.",
  hangout_request: "A duo wants to hang out with you.",
  hangout_accepted: "A duo accepted your hangout request.",
  hangout_confirmed: "Your hangout is confirmed — the chat room is open.",
  match: "You matched with a new duo.",
  solo_request: "Someone sent you a 1:1 request.",
  solo_accepted: "Your 1:1 request was accepted.",
  plan_proposed: "Someone suggested a plan for this week.",
  plan_confirmed: "Your plan is confirmed.",
  plan_guest_invited: "A friend invited you to join this week's plan.",
  plan_guest_accepted: "Your friend accepted the +1 invite.",
  plan_guest_declined: "Your friend declined the +1 invite.",
};

// Builds a friendlier body using the notification payload when available.
function buildPushBody(
  type: string,
  payload: Record<string, unknown>,
): string {
  const duoName = typeof payload.duo_name === "string" && payload.duo_name.trim()
    ? payload.duo_name.trim()
    : null;
  const matchedName =
    typeof payload.matched_duo_name === "string" &&
      payload.matched_duo_name.trim()
      ? payload.matched_duo_name.trim()
      : null;

  const acceptedByName =
    typeof payload.accepted_by_name === "string" &&
      payload.accepted_by_name.trim()
      ? payload.accepted_by_name.trim()
      : null;

  const senderName =
    typeof payload.sender_name === "string" && payload.sender_name.trim()
      ? payload.sender_name.trim()
      : null;
  const partnerName =
    typeof payload.partner_name === "string" && payload.partner_name.trim()
      ? payload.partner_name.trim()
      : null;
  const timeLabel =
    typeof payload.time_label === "string" && payload.time_label.trim()
      ? payload.time_label.trim()
      : null;
  const place =
    typeof payload.place === "string" && payload.place.trim()
      ? payload.place.trim()
      : null;
  const inviterName =
    typeof payload.inviter_name === "string" && payload.inviter_name.trim()
      ? payload.inviter_name.trim()
      : null;
  const guestName =
    typeof payload.guest_name === "string" && payload.guest_name.trim()
      ? payload.guest_name.trim()
      : null;

  switch (type) {
    case "hangout_request":
      return duoName
        ? `${duoName} wants to hang out with you.`
        : PUSH_BODIES.hangout_request;
    case "hangout_accepted":
      return duoName
        ? `${duoName} accepted your hangout request.`
        : PUSH_BODIES.hangout_accepted;
    case "hangout_confirmed":
      return duoName
        ? `Confirmed with ${duoName} — your chat room is open.`
        : PUSH_BODIES.hangout_confirmed;
    case "homie_accepted":
      return acceptedByName
        ? `${acceptedByName} accepted your homie request!`
        : PUSH_BODIES.homie_accepted;
    case "match":
      return matchedName
        ? `You matched with ${matchedName}.`
        : PUSH_BODIES.match;
    case "solo_request":
      return senderName
        ? `${senderName} sent you a 1:1 request.`
        : PUSH_BODIES.solo_request;
    case "solo_accepted":
      return partnerName
        ? `${partnerName} accepted your 1:1 request.`
        : PUSH_BODIES.solo_accepted;
    case "plan_proposed":
      return senderName
        ? `${senderName} suggested ${[timeLabel, place].filter(Boolean).join(" at ") || "a plan"}.`
        : PUSH_BODIES.plan_proposed;
    case "plan_confirmed":
      return partnerName
        ? `${partnerName} confirmed your plan.`
        : PUSH_BODIES.plan_confirmed;
    case "plan_guest_invited":
      return inviterName
        ? `${inviterName} invited you as their +1.`
        : PUSH_BODIES.plan_guest_invited;
    case "plan_guest_accepted":
      return guestName
        ? `${guestName} is coming as your +1.`
        : PUSH_BODIES.plan_guest_accepted;
    case "plan_guest_declined":
      return guestName
        ? `${guestName} can't make it as your +1.`
        : PUSH_BODIES.plan_guest_declined;
    default:
      return PUSH_BODIES[type] ?? "You have a new notification.";
  }
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(req),
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function toFcmData(
  data: Record<string, unknown> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!data) return result;

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    result[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return result;
}

function validatePayload(
  value: unknown,
): { payload?: PushRequest; error?: string } {
  if (!isPlainObject(value)) {
    return { error: "Request body must be a JSON object." };
  }

  const { notificationId } = value;
  if (typeof notificationId !== "string" || notificationId.trim() === "") {
    return { error: "notificationId must be a non-empty string." };
  }

  return {
    payload: {
      notificationId: notificationId.trim(),
    },
  };
}

function parseServiceAccount(rawServiceAccount: string): ServiceAccount | null {
  try {
    const parsed: unknown = JSON.parse(rawServiceAccount);
    if (!isPlainObject(parsed)) return null;
    if (
      typeof parsed.client_email !== "string" ||
      parsed.client_email.trim() === ""
    ) return null;
    if (
      typeof parsed.private_key !== "string" || parsed.private_key.trim() === ""
    ) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch {
    return null;
  }
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function getAccessToken(
  serviceAccount: ServiceAccount,
): Promise<string | null> {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenData: unknown = await tokenRes.json().catch(() => null);

  if (
    !tokenRes.ok || !isPlainObject(tokenData) ||
    typeof tokenData.access_token !== "string"
  ) {
    console.error("Firebase OAuth token request failed:", tokenRes.status);
    return null;
  }
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed. Use POST." }, 405);
  }

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return jsonResponse(
      req,
      { error: "Request body must be valid JSON." },
      400,
    );
  }

  const validation = validatePayload(requestBody);
  if (!validation.payload) {
    return jsonResponse(req, {
      error: validation.error ?? "Invalid push request.",
    }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("Missing Supabase Edge Function environment variables.");
    return jsonResponse(req, {
      error: "Push notification service is not configured.",
    }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse(req, { error: "Authentication required." }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse(req, { error: "Authentication required." }, 401);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: notification, error: notificationError } = await adminClient
    .from("notifications")
    .select("id, user_id, type, payload")
    .eq("id", validation.payload.notificationId)
    .maybeSingle();
  if (notificationError) {
    console.error("Notification lookup failed:", notificationError.message);
    return jsonResponse(req, {
      error: "Unable to load push notification.",
    }, 500);
  }
  if (!notification) {
    return jsonResponse(req, { error: "Notification not found." }, 404);
  }

  const notificationPayload = isPlainObject(notification.payload)
    ? notification.payload
    : {};
  if (!SUPPORTED_TYPES.has(notification.type)) {
    return jsonResponse(req, {
      success: true,
      skipped: true,
      reason: "unsupported_notification_type",
    }, 200);
  }

  // homie_request is special: the caller is the sender, so verify the caller
  // owns the originating request before pushing to the recipient.
  if (notification.type === "homie_request") {
    if (notificationPayload.from_user_id !== authData.user.id) {
      return jsonResponse(req, {
        error: "Not authorized to send this notification.",
      }, 403);
    }

    if (
      typeof notificationPayload.homie_request_id !== "string" ||
      !notificationPayload.homie_request_id.trim()
    ) {
      return jsonResponse(req, {
        success: true,
        skipped: true,
        reason: "unverified_notification_event",
      }, 200);
    }

    const { data: homieRequest, error: homieRequestError } = await adminClient
      .from("homie_requests")
      .select("id")
      .eq("id", notificationPayload.homie_request_id)
      .eq("from_user_id", authData.user.id)
      .eq("to_user_id", notification.user_id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (homieRequestError) {
      console.error(
        "Homie request verification failed:",
        homieRequestError.message,
      );
      return jsonResponse(req, {
        error: "Unable to verify push notification.",
      }, 500);
    }
    if (!homieRequest) {
      return jsonResponse(req, {
        success: true,
        skipped: true,
        reason: "unverified_notification_event",
      }, 200);
    }
  }
  // For hangout_request / hangout_accepted / match the notification row itself
  // is created server-side under RLS for the recipient, so no extra ownership
  // check is required here — deliver the push to the recipient's device.

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("fcm_token")
    .eq("id", notification.user_id)
    .maybeSingle();
  if (profileError) {
    console.error("Recipient token lookup failed:", profileError.message);
    return jsonResponse(req, {
      error: "Unable to load push recipient.",
    }, 500);
  }
  if (typeof profile?.fcm_token !== "string" || !profile.fcm_token.trim()) {
    return jsonResponse(req, {
      success: true,
      skipped: true,
      reason: "no_fcm_token",
    }, 200);
  }

  const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const rawServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!firebaseProjectId || !rawServiceAccount) {
    console.error("Missing Firebase Edge Function secrets.");
    return jsonResponse(req, {
      error: "Push notification service is not configured.",
    }, 500);
  }

  const serviceAccount = parseServiceAccount(rawServiceAccount);
  if (!serviceAccount) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT secret.");
    return jsonResponse(req, {
      error: "Push notification service is not configured.",
    }, 500);
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return jsonResponse(req, {
        error: "Unable to authorize Firebase messaging request.",
      }, 502);
    }

    const title = PUSH_TITLES[notification.type] ?? "DUO OC";
    const body = buildPushBody(notification.type, notificationPayload);
    const data = {
      ...toFcmData(notificationPayload),
      type: String(notification.type),
      notification_id: String(notification.id),
    };
    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${
        encodeURIComponent(firebaseProjectId)
      }/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: profile.fcm_token.trim(),
            notification: { title, body },
            data,
            webpush: {
              notification: {
                title,
                body,
                icon: "/icon.png",
              },
            },
          },
        }),
      },
    );
    const fcmResult: unknown = await fcmRes.json().catch(() => null);

    if (!fcmRes.ok) {
      console.error("FCM send failed:", fcmRes.status);
      return jsonResponse(req, {
        error: "Firebase rejected the push notification request.",
        status: fcmRes.status,
      }, 502);
    }

    const messageName =
      isPlainObject(fcmResult) && typeof fcmResult.name === "string"
        ? fcmResult.name
        : null;
    return jsonResponse(req, { success: true, name: messageName }, 200);
  } catch (error) {
    console.error(
      "send-push-notification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return jsonResponse(
      req,
      { error: "Unable to send push notification." },
      500,
    );
  }
});
