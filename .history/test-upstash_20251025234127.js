// Simple test to verify Upstash credentials
require('dotenv').config({ path: '.env.local' });
const { Index } = require('@upstash/vector');

console.log('Testing Upstash credentials...');
console.log('URL:', process.env.UPSTASH_VECTOR_REST_URL);
console.log('Token (first 20 chars):', process.env.UPSTASH_VECTOR_REST_TOKEN?.substring(0, 20));

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
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
