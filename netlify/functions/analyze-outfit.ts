import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Google Cloud Vision API setup
const vision = require('@google-cloud/vision');

let visionClient: any;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({ credentials });
  } else if (process.env.GOOGLE_CLOUD_KEY_FILE) {
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

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Function invoked, parsing body...');
    const { outfitId } = JSON.parse(event.body || '{}');
    console.log('Outfit ID:', outfitId);

    if (!outfitId) {
      console.error('Missing outfitId in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'outfitId is required' }),
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

    // Analyze image with Google Vision API
    console.log('Analyzing image:', outfit.image_url);
    console.log('Image URL type:', typeof outfit.image_url);
    console.log('Image URL length:', outfit.image_url?.length);
    
    if (!outfit.image_url || !outfit.image_url.startsWith('http')) {
      console.error('Invalid image URL:', outfit.image_url);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid image URL' }),
      };
    }
    
    const [result] = await visionClient.objectLocalization(outfit.image_url);
    const objects = result.localizedObjectAnnotations || [];
    
    console.log('Raw Vision API response:', JSON.stringify(result, null, 2));
    console.log('Number of objects detected:', objects.length);

    console.log('Detected objects:', objects.map((obj: any) => ({ name: obj.name, score: obj.score })));

    // TEMPORARY: Accept ALL objects to see what Google Vision detects
    // Filter only by confidence score
    const clothingItems = objects.filter((obj: any) => obj.score > 0.5);

    console.log(`Found ${clothingItems.length} items with confidence > 0.5`);

    // Save detected items to database
    for (const obj of clothingItems) {
      await supabase
        .from('outfit_items')
        .insert({
          outfit_id: outfitId,
          item_name: obj.name,
          bounding_box: {
            x: obj.boundingPoly.normalizedVertices[0].x,
            y: obj.boundingPoly.normalizedVertices[0].y,
            width: obj.boundingPoly.normalizedVertices[2].x - obj.boundingPoly.normalizedVertices[0].x,
            height: obj.boundingPoly.normalizedVertices[2].y - obj.boundingPoly.normalizedVertices[0].y,
          },
          confidence: obj.score,
        });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        itemsDetected: clothingItems.length,
        items: clothingItems.map((obj: any) => obj.name)
      }),
    };
  } catch (error: any) {
    console.error('Error analyzing outfit:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      }),
    };
  }
};
