import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = new Set([
  "https://duo-oc.com",
  "https://duo-oc.vercel.app",
  "http://localhost:5173",
]);

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

type PushPayload = {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

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
): { payload?: PushPayload; error?: string } {
  if (!isPlainObject(value)) {
    return { error: "Request body must be a JSON object." };
  }

  const { token, title, body, data } = value;
  if (typeof token !== "string" || token.trim() === "") {
    return { error: "token must be a non-empty string." };
  }
  if (typeof title !== "string" || title.trim() === "") {
    return { error: "title must be a non-empty string." };
  }
  if (typeof body !== "string" || body.trim() === "") {
    return { error: "body must be a non-empty string." };
  }
  if (data !== undefined && !isPlainObject(data)) {
    return { error: "data must be an object when provided." };
  }

  return {
    payload: {
      token: token.trim(),
      title: title.trim(),
      body: body.trim(),
      data: toFcmData(data as Record<string, unknown> | undefined),
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

    const { token, title, body, data } = validation.payload;
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
            token,
            notification: { title, body },
            data,
            webpush: {
              notification: {
                title,
                body,
                icon: "/icon-192.png",
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
