import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetch-utils";

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

let kv: any = null;
let kvConfigured: boolean | null = null;

function isKVConfigured(): boolean {
  if (kvConfigured !== null) return kvConfigured;
  kvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  return kvConfigured;
}

function getKV() {
  if (kv !== null) return kv;
  if (!isKVConfigured()) return null;
  
  try {
    const url = process.env.KV_REST_API_URL!;
    const token = process.env.KV_REST_API_TOKEN!;
    
    kv = {
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
      async del(key: string) {
        const response = await fetchWithRetry(`${url}/del/${encodeURIComponent(key)}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        }, { retries: 2, timeoutMs: 8000 });
        return response.ok;
      },
    };
    
    return kv;
  } catch (error) {
    console.error("KV initialization error:", error);
    return null;
  }
}

// GET /api/tracker-status - retrieve all status overrides
export async function GET(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kvStore = getKV();
  if (!kvStore) {
    return NextResponse.json({ statuses: {} });
  }

  try {
    const keys = await kvStore.keys("tracker:status:*");
    const statuses: Record<string, { status?: string; cleared?: boolean; clearedAt?: string }> = {};
    
    for (const key of keys) {
      const itemKey = key.replace("tracker:status:", "");
      const value = await kvStore.get(key);
      if (value) {
        statuses[itemKey] = value as any;
      }
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Failed to fetch statuses:", error);
    return NextResponse.json({ error: "Failed to fetch statuses" }, { status: 500 });
  }
}

// POST /api/tracker-status - save status override for an item
export async function POST(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kvStore = getKV();
  if (!kvStore) {
    return NextResponse.json({ 
      error: "KV store not configured. Status will be saved to localStorage only." 
    }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { itemKey, status, cleared } = body;

    if (!itemKey) {
      return NextResponse.json({ error: "itemKey is required" }, { status: 400 });
    }

    const key = `tracker:status:${itemKey}`;
    const value = {
      status: status || null,
      cleared: cleared || false,
      updatedAt: new Date().toISOString(),
    };

    await kvStore.set(key, value);

    return NextResponse.json({ success: true, itemKey, value });
  } catch (error) {
    console.error("Failed to save status:", error);
    return NextResponse.json({ error: "Failed to save status" }, { status: 500 });
  }
}

// DELETE /api/tracker-status - remove status override
export async function DELETE(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kvStore = getKV();
  if (!kvStore) {
    return NextResponse.json({ error: "KV store not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const itemKey = searchParams.get("itemKey");

    if (!itemKey) {
      return NextResponse.json({ error: "itemKey is required" }, { status: 400 });
    }

    const key = `tracker:status:${itemKey}`;
    await kvStore.del(key);

    return NextResponse.json({ success: true, itemKey });
  } catch (error) {
    console.error("Failed to delete status:", error);
    return NextResponse.json({ error: "Failed to delete status" }, { status: 500 });
  }
}
