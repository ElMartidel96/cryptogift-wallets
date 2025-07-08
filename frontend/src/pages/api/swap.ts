import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to, amount, chainId = 8453 } = req.body; // Base mainnet

    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: from, to, amount' });
    }

    const url = new URL(`https://base.api.0x.org/swap/v2/quote`);
    url.searchParams.append('buyToken', to);
    url.searchParams.append('sellToken', from);
    url.searchParams.append('sellAmount', amount);
    url.searchParams.append('permit2', 'true');
    url.searchParams.append('chainId', chainId.toString());

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if available for higher rate limits
    if (process.env.ZEROX_API_KEY) {
      headers['0x-api-key'] = process.env.ZEROX_API_KEY;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('0x API error:', errorData);
      return res.status(response.status).json({ 
        error: '0x API request failed',
        details: errorData 
      });
    }

    const quote = await response.json();
    const { calldata, to: dest, value, permit2 } = quote;

    if (!calldata || !dest) {
      return res.status(500).json({ error: 'Invalid response from 0x API' });
    }

    res.status(200).json({ 
      calldata, 
      dest, 
      value: value || '0',
      permit2: permit2 || null
    });
  } catch (error) {
    console.error('Swap API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}