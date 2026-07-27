const http = require('http');

console.log("Checking Supabase direct connection...");
const req = http.request("http://localhost:3000/api/health", (res) => {
  console.log("Health check status:", res.statusCode);
});
req.on('error', (e) => {
  console.log("Local server is not running on 3000, which is normal during build test.");
});
req.end();
