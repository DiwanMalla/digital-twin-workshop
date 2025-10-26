// Test Upstash using raw fetch (not SDK)
const url = 'https://legible-albacore-13219-us1-vector.upstash.io';
const token = 'ABoFMGxlZ2libGUtYWxiYWNvcmUtMTMyMTktdXMxYWRtaW5NRGN6WW1Nell6TTROR0ZrWmkwME1XVXhMV0ZrWWpJdE5EQmlNRGMyT0RZMllURTQ=';

console.log('Testing with raw fetch...');

async function test() {
  try {
    const response = await fetch(`${url}/info`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('ERROR:', error);
  }
}

test();
