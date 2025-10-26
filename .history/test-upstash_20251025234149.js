// Simple test to verify Upstash credentials  
const { Index } = require('@upstash/vector');

// Hardcode for testing
const url = 'https://legible-albacore-13219-us1-vector.upstash.io';
const token = 'ABoFMGxlZ2libGUtYWxiYWNvcmUtMTMyMTktdXMxYWRtaW5NRGN6WW1Nell6TTROR0ZrWmkwME1XVXhMV0ZrWWpJdE5EQmlNRGMyT0RZMllURTQ=';

console.log('Testing Upstash credentials...');
console.log('URL:', url);
console.log('Token (first 20 chars):', token.substring(0, 20));

const index = new Index({
  url,
  token,
});

async function test() {
  try {
    console.log('\nCalling index.info()...');
    const info = await index.info();
    console.log('SUCCESS! Info:', JSON.stringify(info, null, 2));
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  }
}

test();
