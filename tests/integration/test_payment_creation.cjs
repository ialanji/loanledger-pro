const http = require("http");

const testPaymentCreation = async () => {
  console.log("=== ТЕСТ СОЗДАНИЯ ПЛАТЕЖА ЧЕРЕЗ API ===");
  
  // Данные для создания платежа
  const paymentData = {
    payments: [{
      periodNumber: 99,
      dueDate: "2024-12-31",
      principalDue: 1000,
      interestDue: 100,
      totalDue: 1100
    }]
  };

  const postData = JSON.stringify(paymentData);
  
  const options = {
    hostname: "localhost",
    port: 3001,
    path: "/api/credits/C2360671/payments/bulk",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          console.log("Статус ответа:", res.statusCode);
          console.log("Ответ сервера:", result);
          resolve(result);
        } catch (e) {
          console.log("Ошибка парсинга:", e.message);
          console.log("Тело ответа:", body);
          resolve({ error: "Parse error" });
        }
      });
    });

    req.on("error", (err) => {
      console.error("Ошибка запроса:", err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

testPaymentCreation().then(() => {
  console.log("Тест завершен");
}).catch(console.error);