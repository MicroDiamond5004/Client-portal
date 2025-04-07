const baseUrl = 'https://portal.dev.lead.aero/pub/v1/';
const token = '789085fb-3cdc-468a-9c17-bf960b3f12a2';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

async function fetchByURL<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<any> {
  const { method = 'POST', body, headers = {} } = options;

  const response = await fetch(`${baseUrl}${url}`, {
    method,
    mode: 'no-cors',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
        {
            "active": true,
            "fields": {
                "*": true
            },
            "from": 280,
            "size": 1
        }
    )
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`API error: ${response.status} - ${errorText}`);
  }

  if (response.ok) {
    const result: T = await response.json();
    return result
  }
  return null;
}

export default fetchByURL;
