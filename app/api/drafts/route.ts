import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetch-utils";

type DraftEntry = {
  item: string;
  org: string;
  draft: string;
  updated_at: string;
};

let kv: any = null;
let kvError: string | null = null;
let kvConfigured: boolean | null = null;

function isKVConfigured(): boolean {
  if (kvConfigured !== null) return kvConfigured;
  kvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  return kvConfigured;
}

function getKV() {
  if (kv !== null) return kv;
  if (kvError !== null) return null;
  
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    if (!url || !token) {
      kvError = "KV not configured";
      return null;
    }
    
    kv = {
      url,
      token,
      async set(key: string, value: any) {
        const response = await fetchWithRetry(`${url}/set/${encodeURIComponent(key)}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        }, { retries: 2, timeoutMs: 8000 });
        if (!response.ok) throw new Error("KV set failed");
        return response.json();
      },
      async get(key: string) {
        const response = await fetchWithRetry(`${url}/get/${encodeURIComponent(key)}`, {
          headers: { "Authorization": `Bearer ${token}` },
        }, { retries: 2, timeoutMs: 8000 });
        if (!response.ok) return null;
        const data = await response.json();
        return data.result;
      },
      async keys(pattern: string) {
        const response = await fetchWithRetry(`${url}/keys/${encodeURIComponent(pattern)}`, {
          headers: { "Authorization": `Bearer ${token}` },
        }, { retries: 2, timeoutMs: 8000 });
        if (!response.ok) return [];
        const data = await response.json();
        return data.result || [];
      },
    };
    
    return kv;
  } catch (error) {
    kvError = error instanceof Error ? error.message : "Failed to initialize KV";
    console.error("KV initialization error:", error);
    return null;
  }
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function checkPassword(req: NextRequest): boolean {
  const password = process.env.DRAFTS_PASSWORD;
  
  if (!password) {
    return false;
  }
  
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (constantTimeCompare(token, password)) {
      return true;
    }
  }
  
  const url = new URL(req.url);
  const keyParam = url.searchParams.get("key");
  if (keyParam && constantTimeCompare(keyParam, password)) {
    return true;
  }
  
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item, org, draft } = body;
    
    if (!item || !org || draft === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: item, org, draft" },
        { status: 400 }
      );
    }
    
    if (!isKVConfigured()) {
      return NextResponse.json(
        { error: "KV storage not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables." },
        { status: 503 }
      );
    }
    
    const store = getKV();
    if (!store) {
      return NextResponse.json(
        { error: "KV storage unavailable" },
        { status: 503 }
      );
    }
    
    const key = `draft:${org}:${item}`;
    const entry: DraftEntry = {
      item,
      org,
      draft,
      updated_at: new Date().toISOString(),
    };
    
    await store.set(key, entry);
    
    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Draft save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save draft" },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide DRAFTS_PASSWORD via Authorization header or ?key= parameter" },
      { status: 401 }
    );
  }
  
  try {
    if (!isKVConfigured()) {
      return NextResponse.json({ drafts: [] });
    }
    
    const store = getKV();
    if (!store) {
      return NextResponse.json({ drafts: [] });
    }
    
    const keys = await store.keys("draft:*");
    
    const drafts: DraftEntry[] = [];
    for (const key of keys) {
      const entry = await store.get(key);
      if (entry) {
        drafts.push(entry);
      }
    }
    
    drafts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Draft fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch drafts" },
      { status: 503 }
    );
  }
}
