import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Outfit, Rating, OutfitWithRating, OutfitItem, ShoppingLink, OutfitItemWithLinks } from '../../../shared/types';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Google Cloud Vision API setup
const vision = require('@google-cloud/vision');

// For Netlify: credentials should be stored as GOOGLE_APPLICATION_CREDENTIALS env var (JSON string)
let visionClient;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Parse JSON credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({ credentials });
  } else if (process.env.GOOGLE_CLOUD_KEY_FILE) {
    // Fallback to file path (for local development)
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });
  } else {
    console.warn('Google Vision API credentials not configured');
    visionClient = null;
  }
} catch (error) {
  console.error('Failed to initialize Google Vision client:', error);
  visionClient = null;
}

// SerpApi for shopping search
const serpApiKey = process.env.SERPAPI_KEY;

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Debug logging
    console.log('Received request:', {
      method: event.httpMethod,
      path: event.path,
      body: event.body ? JSON.parse(event.body) : null
    });

    if (event.httpMethod === 'GET') {
      // Get outfits with ratings and items
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([]),
        };
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
      const outfitMap = new Map<
        string,
        {
          count: number;
          sum: number;
          outfit: (typeof outfitsData)[0];
          ratings: Rating[];
          items: OutfitItemWithLinks[];
        }
      >();

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
      const outfitsWithRatings: OutfitWithRating[] = outfitsData
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(outfitsWithRatings),
      };
    }

    if (event.httpMethod === 'POST' && event.path.includes('/analyze-outfit')) {
      const { outfitId } = JSON.parse(event.body || '{}');

      if (!outfitId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'outfitId is required' }),
        };
      }

      // Get outfit image URL
      const { data: outfit, error } = await supabase
        .from('outfits')
        .select('image_url')
        .eq('id', outfitId)
        .single();

      if (error || !outfit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Outfit not found' }),
        };
      }

      // Check if Vision API is configured
      if (!visionClient) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: 'Google Vision API not configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable.' }),
        };
      }

      // Analyze image with Google Vision API
      const [result] = await visionClient.objectLocalization(outfit.image_url);
      const objects = result.localizedObjectAnnotations || [];

      // Filter for clothing items
      const clothingItems = objects.filter(obj =>
        ['Shirt', 'Pants', 'Shoes', 'Hat', 'Jacket', 'Dress', 'Skirt', 'Shorts', 'Jeans', 'T-shirt', 'Sweater', 'Coat', 'Blouse', 'Cardigan', 'Vest', 'Blazer', 'Suit', 'Tie', 'Bowtie', 'Scarf', 'Gloves', 'Socks', 'Underwear', 'Bra', 'Jumpsuit', 'Overalls', 'Romper', 'Bodysuit', 'Leggings', 'Tights', 'Stockings', 'Boots', 'Sneakers', 'Sandals', 'Flats', 'Heels', 'Loafers', 'Oxfords', 'Derby', 'Monk', 'Brogue', 'Chelsea', 'Chukka', 'Desert', 'Combat', 'Work', 'Rain', 'Snow', 'Hiking', 'Running', 'Basketball', 'Soccer', 'Tennis', 'Golf', 'Baseball', 'Football', 'Hockey', 'Skiing', 'Snowboarding', 'Surfing', 'Swimming', 'Diving', 'Cycling'].includes(obj.name)
      );

      // Process each detected item
      for (const obj of clothingItems) {
        // Insert outfit item
        const { data: itemData, error: itemError } = await supabase
          .from('outfit_items')
          .insert({
            outfit_id: outfitId,
            item_name: obj.name.toLowerCase(),
            bounding_box: {
              x: obj.boundingPoly.normalizedVertices[0].x,
              y: obj.boundingPoly.normalizedVertices[0].y,
              width: obj.boundingPoly.normalizedVertices[2].x - obj.boundingPoly.normalizedVertices[0].x,
              height: obj.boundingPoly.normalizedVertices[2].y - obj.boundingPoly.normalizedVertices[0].y,
            },
            confidence: obj.score,
          })
          .select()
          .single();

        if (itemError) continue;

        // Search for shopping links using SerpApi
        try {
          const searchQuery = `${obj.name} clothing`;
          const serpResponse = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}`);
          const serpData = await serpResponse.json();

          // Insert top 3 shopping results
          const shoppingResults = serpData.shopping_results?.slice(0, 3) || [];
          for (const result of shoppingResults) {
            await supabase
              .from('shopping_links')
              .insert({
                outfit_item_id: itemData.id,
                title: result.title,
                url: result.link,
                price: result.price,
                retailer: result.source,
                image_url: result.thumbnail,
              });
          }
        } catch (searchError) {
          console.error('Shopping search error:', searchError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, itemsDetected: clothingItems.length }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
