const baseUrl = 'https://portal.dev.lead.aero/pub/v1/';
const token = '789085fb-3cdc-468a-9c17-bf960b3f12a2';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

async function fetchELMA<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T | null> {
  const { method = 'POST', body, headers = {} } = options;

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} - ${errorText}`);
      return null;
    }

    const result: T = await response.json();
    return result;
  } catch (err) {
    console.error('❌ Fetch error:', err);
    return null;
  }
}

export default fetchELMA;
