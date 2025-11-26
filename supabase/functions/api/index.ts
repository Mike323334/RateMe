import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for Firebase Hosting domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // In production, replace with your Firebase Hosting URL
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle CORS preflight requests
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Clothing-related categories to filter from Vision API results
const CLOTHING_CATEGORIES = [
  'shirt', 't-shirt', 'blouse', 'top', 'tank top',
  'pants', 'jeans', 'trousers', 'shorts', 'leggings',
  'dress', 'skirt',
  'jacket', 'coat', 'hoodie', 'sweater', 'cardigan', 'blazer',
  'shoes', 'sneakers', 'boots', 'sandals', 'heels',
  'hat', 'cap', 'beanie',
  'bag', 'backpack', 'purse', 'handbag',
  'sunglasses', 'watch', 'belt', 'tie', 'scarf',
  'sock', 'socks', 'glove', 'gloves'
];

// API route handlers
const handlers: Record<string, (req: Request) => Promise<Response>> = {
  "/api/ping": async () => {
    const pingMessage = Deno.env.get("PING_MESSAGE") ?? "ping";
    return new Response(
      JSON.stringify({ message: pingMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  },

  "/api/demo": async () => {
    return new Response(
      JSON.stringify({ message: "Hello from Supabase Edge Function" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  },

  "/api/analyze-outfit": async (req: Request) => {
    try {
      const { outfitId } = await req.json();
      
      if (!outfitId) {
        return new Response(
          JSON.stringify({ error: "outfitId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get outfit image URL
      const { data: outfit, error: outfitError } = await supabase
        .from("outfits")
        .select("image_url")
        .eq("id", outfitId)
        .single();

      if (outfitError || !outfit) {
        return new Response(
          JSON.stringify({ error: "Outfit not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Call the new detect-clothes function instead of Google Vision API
      const detectClothesUrl = new URL("/detect-clothes", Deno.env.get("SUPABASE_FUNCTIONS_URL"));
      const detectClothesResponse = await fetch(detectClothesUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: outfit.image_url }),
      });

      if (!detectClothesResponse.ok) {
        const errorText = await detectClothesResponse.text();
        console.error("Detect-clothes API error:", errorText);
        return new Response(
          JSON.stringify({ error: "Detect clothes API request failed", details: errorText }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const detectClothesData = await detectClothesResponse.json();

      // Hugging Face response is an array of detected objects
      // Example element: {label: string, score: number, box: [x_min, y_min, width, height]}
      const hfDetectedItems = Array.isArray(detectClothesData) ? detectClothesData : [];

      // Filter to clothing categories based on label matching (case insensitive)
      const clothingItems = hfDetectedItems.filter(item => {
        const name = (item.label || "").toLowerCase();
        return CLOTHING_CATEGORIES.some(category => name.includes(category));
      });

      // Convert bounding boxes [x_min, y_min, width, height] to normalized bounding box objects
      // HF boxes might already be normalized, but ensure clamping between 0 and 1
      const normalizeBox = (box: number[]) => {
        const [x, y, width, height] = box;
        return {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          width: Math.max(0, Math.min(1, width)),
          height: Math.max(0, Math.min(1, height)),
        };
      };

      const itemsToInsert = clothingItems.map((item: any) => {
        const boundingBox = normalizeBox(item.box);
        return {
          outfit_id: outfitId,
          item_name: item.label,
          bounding_box: boundingBox,
          confidence: item.score,
        };
      });

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("outfit_items")
          .insert(itemsToInsert);

        if (insertError) {
          console.error("Database insert error:", insertError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          itemsDetected: clothingItems.length,
          items: itemsToInsert,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error in analyze-outfit:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error", details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Find matching handler
    const handler = handlers[path];
    
    if (handler) {
      return await handler(req);
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: "Not Found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

