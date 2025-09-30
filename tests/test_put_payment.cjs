// Test script to call PUT /api/payments/:id/status using Node fetch
// Usage: node test_put_payment.cjs

(async () => {
  try {
    const id = '8988627c-18c1-474f-a5a0-5a161830a3fb';
    const url = `http://localhost:3001/api/payments/${id}/status`;
    const body = { status: 'paid', paidAmount: 77254.79 };
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('HTTP status:', res.status);
    console.log('Header X-Route-Version:', res.headers.get('x-route-version'));
    console.log('Header X-Payments-Middleware:', res.headers.get('x-payments-middleware'));
    console.log('Header X-Error-Handler:', res.headers.get('x-error-handler'));
    console.log('Header Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Response text:', text);
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON keys:', Object.keys(json));
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Non-JSON response');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
})();