// Simple test to verify Upstash credentials
const { Index } = require("@upstash/vector");

// Fresh database credentials
const url = "https://sweet-colt-25787-us1-vector.upstash.io";
const token =
  "ABQFMHN3ZWV0LWNvbHQtMjU3ODctdXMxYWRtaW5NalE1TW1ZMU16Y3RNVGxsWVMwME1qRTJMVGxoWkRFdFlXTTNZamM1WTJaak5HWXc=";

console.log("Testing Upstash credentials...");
console.log("URL:", url);
console.log("Token (first 20 chars):", token.substring(0, 20));

const index = new Index({
  url,
  token,
});

async function test() {
  try {
    console.log("\nCalling index.info()...");
    const info = await index.info();
    console.log("SUCCESS! Info:", JSON.stringify(info, null, 2));
  } catch (error) {
    console.error("ERROR:", error.message);
    console.error("Full error:", error);
  }
}

test();
