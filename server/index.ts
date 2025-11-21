import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
// <-- import your component

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // API route for outfits
  app.get("/api", async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || 'dummy-url',
        process.env.SUPABASE_ANON_KEY || 'dummy-key'
      );

      // Get all outfits
      const { data: outfitsData, error: outfitsError } = await supabase
        .from("outfits")
        .select(`
          id,
          created_at,
          image_url,
          image_path,
          file_hash,
          username
        `)
        .order("created_at", { ascending: false });

      if (outfitsError) throw outfitsError;

      if (!outfitsData) {
        throw new Error('No outfits data returned from Supabase');
      }

      if (outfitsData.length === 0) {
        return res.json([]);
      }

      // Get all ratings (include tags)
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select(`
          id,
          created_at,
          outfit_id,
          score,
          feedback,
          username,
          tags
        `);

      if (ratingsError) throw ratingsError;

      // Get outfit items and shopping links
      const { data: itemsData, error: itemsError } = await supabase
        .from("outfit_items")
        .select(`
          id,
          outfit_id,
          item_name,
          bounding_box,
          confidence,
          shopping_links (
            id,
            title,
            url,
            price,
            retailer,
            image_url
          )
        `);

      if (itemsError) throw itemsError;

      // Calculate average rating for each outfit
      const outfitMap = new Map();

      outfitsData.forEach((outfit) => {
        outfitMap.set(outfit.id, { count: 0, sum: 0, outfit, ratings: [], items: [] });
      });

      ratingsData?.forEach((rating) => {
        const entry = outfitMap.get(rating.outfit_id);
        if (entry) {
          entry.count += 1;
          entry.sum += rating.score;
          entry.ratings.push({
            ...rating,
            username: rating.username || "Anonymous"
          });
        }
      });

      // Add items to outfit map
      itemsData?.forEach((item) => {
        const entry = outfitMap.get(item.outfit_id);
        if (entry) {
          entry.items.push({
            ...item,
            shopping_links: item.shopping_links || []
          });
        }
      });

      // Convert to array with calculated averages and score (1-100), then sort by score100 desc
      const outfitsWithRatings = outfitsData
        .map((outfit) => {
          const entry = outfitMap.get(outfit.id);
          if (!entry) {
            return {
              ...outfit,
              averageRating: 0,
              totalRatings: 0,
              latestRatings: [],
              score100: 0,
              items: [],
            };
          }

          const avg = entry.count > 0 ? entry.sum / entry.count : 0;
          const score100 = Math.round(avg * 10);

          return {
            ...outfit,
            username: outfit.username || "Anonymous",
            averageRating: avg,
            totalRatings: entry.count,
            latestRatings: entry.ratings
              .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
              .slice(0, 3),
            score100,
            items: entry.items,
          };
        })
        // Sort by score100 (desc), then newest created_at as tiebreaker
        .sort((a, b) => {
          if ((b.score100 || 0) !== (a.score100 || 0)) return (b.score100 || 0) - (a.score100 || 0);
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .filter((outfit, index, self) => {
          // Remove duplicates: compare by file_hash (actual photo content)
          if (outfit.file_hash) {
            return (
              index === self.findIndex((o) => o.file_hash === outfit.file_hash)
            );
          }
          return (
            index === self.findIndex((o) => o.image_url === outfit.image_url)
          );
        });

      res.json(outfitsWithRatings);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}
