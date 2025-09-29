// Simple HTTP probe to test server endpoints and log status/headers/body
import fs from 'node:fs';

const urls = [
  'http://127.0.0.1:3001/api/version',
  'http://127.0.0.1:3001/api/payments/ping',
  'http://127.0.0.1:3001/api/payments'
];

(async () => {
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET' });
      const headers = Object.fromEntries(res.headers.entries());
      const text = await res.text();
      console.log('URL:', u);
      console.log('STATUS:', res.status);
      console.log('HEADERS:', headers);
      console.log('BODY:', text.slice(0, 300));
      console.log('---');
    } catch (e) {
      console.log('ERR:', u, e.message);
      console.log('---');
    }
  }
})();