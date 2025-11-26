// Supabase Edge Function to proxy Hugging Face object detection
// This function receives a JSON payload with an `image_url` field,
// fetches the image, forwards it to the Hugging Face inference API,
// and returns the detection results.


import { serve } from "https://deno.land/std@0.203.0/http/server.ts";


const HF_API_URL = "https://api-inference.huggingface.co/models/valentinafeve/yolos-fashionpedia";
const HF_API_KEY = Deno.env.get("HF_API_KEY");
console.log("BOOT: starting function...");
console.log("HF_API_KEY loaded?", !!HF_API_KEY);


if (!HF_API_KEY) {
  console.error("HF_API_KEY environment variable not set");
}

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, id };
}

function isValidUrl(urlString: string) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  // Enable CORS for any origin (adjust in production as needed)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!HF_API_KEY) {
    return new Response(JSON.stringify({ error: "HF_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      return new Response(JSON.stringify({ error: "Missing image_url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidUrl(image_url)) {
      return new Response(JSON.stringify({ error: "Invalid image_url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the image as a Blob with timeout
    const { controller: imageFetchController, id: imageTimeoutId } = createTimeoutController(15000); // 15s timeout

    let imageResponse;
    try {
      imageResponse = await fetch(image_url, { signal: imageFetchController.signal });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return new Response(JSON.stringify({ error: "Image fetch timeout" }), {
          status: 504,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw e;
    } finally {
      clearTimeout(imageTimeoutId);
    }

    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const imageBlob = await imageResponse.blob();

    // Forward to Hugging Face API with timeout
    const { controller: hfFetchController, id: hfTimeoutId } = createTimeoutController(20000); // 20s timeout

    let hfResponse;
    let hfResponseText;
    try {
      hfResponse = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": imageBlob.type || "image/jpeg",
        },
        body: imageBlob,
        signal: hfFetchController.signal,
      });

      hfResponseText = await hfResponse.text();
      console.log("Hugging Face API status:", hfResponse.status, "response:", hfResponseText);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return new Response(JSON.stringify({ error: "Hugging Face API request timeout" }), {
          status: 504,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw e;
    } finally {
      clearTimeout(hfTimeoutId);
    }

    let result;
    try {
      result = JSON.parse(hfResponseText);
    } catch (e) {
      console.error("Failed to parse Hugging Face API response as JSON:", e);
      return new Response(JSON.stringify({ error: "Invalid response from Hugging Face API" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const status = hfResponse.ok ? 200 : 502;
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Error in detect-clothes function:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
