import { parse } from 'node-html-parser';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log('OG API called with query:', req.query); // Log incoming request

  if (req.method !== 'GET') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    console.log('No URL provided');
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log('Attempting to fetch:', url);
    const response = await fetch(url);
    console.log('Fetch response status:', response.status);
    
    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const root = parse(html);

    const metadata = {
      title: root.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
             root.querySelector('title')?.text || '',
      description: root.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                  root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      image: root.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
      site_name: root.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                new URL(url).hostname
    };

    console.log('Extracted metadata:', metadata);

    // Cache the response for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json(metadata);
  } catch (error) {
    console.error('Detailed error in og.js:', {
      message: error.message,
      stack: error.stack,
      url: url
    });
    return res.status(500).json({ 
      error: 'Failed to fetch metadata',
      details: error.message 
    });
  }
} 