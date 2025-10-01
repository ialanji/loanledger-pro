const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Мок для базы данных
const mockDb = {
  query: jest.fn()
};

// Утилита для преобразования статуса платежа
const normalizeStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'scheduled') return 'SCHEDULED';
  if (s === 'partial') return 'PARTIAL';
  if (s === 'overdue') return 'OVERDUE';
  if (s === 'paid') return 'PAID';
  if (s === 'pending') return 'PENDING';
  if (s === 'canceled') return 'CANCELED';
  return 'SCHEDULED';
};

// Создаем тестовое приложение и мокаем необходимые маршруты
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // GET /api/credits/:id/payments/unprocessed
  // Возвращает периоды со статусами: scheduled, partial, overdue
  app.get('/api/credits/:id/payments/unprocessed', async (req, res) => {
    try {
      const { id } = req.params;
      // В реальном сервере идет сложный запрос к БД; здесь мокаем результат
      const result = await mockDb.query('SELECT * FROM payments WHERE credit_id = $1', [id]);
      const rows = result.rows || [];
      const allowed = new Set(['scheduled', 'partial', 'overdue']);
      const filtered = rows.filter(r => allowed.has(String(r.status || '').toLowerCase()));
      // Приводим к ожидаемой структуре ScheduleItem
      const mapped = filtered.map(r => ({
        paymentDate: r.payment_date || r.paymentDate,
        principalPayment: Number(r.principal_payment ?? r.principalPayment ?? 0),
        interestPayment: Number(r.interest_payment ?? r.interestPayment ?? 0),
        totalPayment: Number(r.total_payment ?? r.totalPayment ?? 0),
        totalDue: Number(r.total_due ?? r.totalDue ?? 0),
        remainingBalance: Number(r.remaining_balance ?? r.remainingBalance ?? 0),
        status: normalizeStatus(r.status)
      }));
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка загрузки непроцессированных периодов' });
    }
  });

  // POST /api/credits/:id/payments/bulk
  // Создает несколько платежей по выбранным периодам
  app.post('/api/credits/:id/payments/bulk', async (req, res) => {
    try {
      const { id } = req.params;
      const { payments } = req.body || {};
      if (!Array.isArray(payments) || payments.length === 0) {
        return res.status(400).json({ error: 'Список платежей обязателен' });
      }

      // Валидация полей
      for (const p of payments) {
        if (!p.payment_date || (!p.principal_amount && !p.interest_amount && !p.total_amount)) {
          return res.status(400).json({ error: 'Неполные данные платежа' });
        }
      }

      // Мокаем вставку в БД
      const values = payments.map(p => [id, p.payment_date, p.principal_amount || 0, p.interest_amount || 0, p.total_amount || 0]);
      await mockDb.query('INSERT INTO payments (credit_id, payment_date, principal_amount, interest_amount, total_amount) VALUES ...', values);

      res.status(201).json({ success: true, created: payments.length });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка пакетного создания платежей' });
    }
  });

  // POST /api/credits/:id/payments/generate
  // Генерирует запланированные платежи из данных кредита
  app.post('/api/credits/:id/payments/generate', async (req, res) => {
    try {
      const { id } = req.params;
      const { credit, rates = [], adjustments = [] } = req.body || {};
      if (!credit) {
        return res.status(400).json({ error: 'Данные кредита обязательны' });
      }
      // Мокаем генерацию расписания: вернем две записи
      const today = new Date();
      const iso = (d) => new Date(d).toISOString().slice(0, 10);
      const schedule = [
        {
          paymentDate: iso(today),
          principalPayment: 100,
          interestPayment: 50,
          totalPayment: 150,
          status: 'SCHEDULED'
        },
        {
          paymentDate: iso(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())),
          principalPayment: 100,
          interestPayment: 45,
          totalPayment: 145,
          status: 'SCHEDULED'
        }
      ];
      res.status(201).json({ success: true, schedule, creditId: id, ratesCount: rates.length, adjustmentsCount: adjustments.length });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка генерации запланированных платежей' });
    }
  });

  return app;
};

describe('API тесты для платежей по кредитам', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/credits/:id/payments/unprocessed', () => {
    it('должен возвращать только непроцессированные периоды (scheduled/partial/overdue)', async () => {
      const rows = [
        { payment_date: '2025-01-15', principal_payment: 1000, interest_payment: 200, total_payment: 1200, status: 'scheduled' },
        { payment_date: '2025-02-15', principal_payment: 1100, interest_payment: 190, total_payment: 1290, status: 'paid' },
        { payment_date: '2025-03-15', principal_payment: 1050, interest_payment: 210, total_payment: 1260, status: 'partial' },
        { payment_date: '2025-04-15', principal_payment: 1000, interest_payment: 220, total_payment: 1220, status: 'overdue' }
      ];
      mockDb.query.mockResolvedValue({ rows });

      const response = await request(app)
        .get('/api/credits/1/payments/unprocessed')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.map(r => r.status)).toEqual(['SCHEDULED', 'PARTIAL', 'OVERDUE']);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM payments WHERE credit_id = $1', ['1']);
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));
      const response = await request(app)
        .get('/api/credits/1/payments/unprocessed')
        .expect(500);
      expect(response.body).toEqual({ error: 'Ошибка загрузки непроцессированных периодов' });
    });
  });

  describe('POST /api/credits/:id/payments/bulk', () => {
    it('должен создавать несколько платежей', async () => {
      const payload = {
        payments: [
          { payment_date: '2025-01-15', principal_amount: 800, interest_amount: 200, total_amount: 1000 },
          { payment_date: '2025-02-15', principal_amount: 900, interest_amount: 190, total_amount: 1090 }
        ]
      };
      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/credits/1/payments/bulk')
        .send(payload)
        .expect(201);

      expect(response.body).toEqual({ success: true, created: 2 });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('должен возвращать ошибку при пустом списке платежей', async () => {
      const response = await request(app)
        .post('/api/credits/1/payments/bulk')
        .send({ payments: [] })
        .expect(400);
      expect(response.body).toEqual({ error: 'Список платежей обязателен' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('должен возвращать ошибку при неполных данных платежа', async () => {
      const response = await request(app)
        .post('/api/credits/1/payments/bulk')
        .send({ payments: [{ payment_date: '2025-01-15' }] })
        .expect(400);
      expect(response.body).toEqual({ error: 'Неполные данные платежа' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/credits/:id/payments/generate', () => {
    it('должен генерировать запланированные платежи из данных кредита', async () => {
      const payload = {
        credit: { id: '1', principal: 100000, payment_day: 15, start_date: '2025-01-01', term_months: 12 },
        rates: [{ rate: 12.5, effective_date: '2025-01-01' }],
        adjustments: []
      };

      const response = await request(app)
        .post('/api/credits/1/payments/generate')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toHaveLength(2);
      expect(response.body.creditId).toBe('1');
      expect(response.body.ratesCount).toBe(1);
      expect(response.body.adjustmentsCount).toBe(0);
    });

    it('должен возвращать ошибку при отсутствии данных кредита', async () => {
      const response = await request(app)
        .post('/api/credits/1/payments/generate')
        .send({})
        .expect(400);
      expect(response.body).toEqual({ error: 'Данные кредита обязательны' });
    });
  });
});