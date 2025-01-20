import { parse } from 'node-html-parser';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
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

    // Cache the response for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return res.status(500).json({ error: 'Failed to fetch metadata' });
  }
} 