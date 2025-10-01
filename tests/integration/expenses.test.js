const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Мок для базы данных
const mockDb = {
  query: jest.fn()
};

// Создаем тестовое приложение
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Мокаем маршруты API
  app.get('/api/expense-sources', async (req, res) => {
    try {
      const result = await mockDb.query('SELECT * FROM expense_sources ORDER BY name');
      res.json(result.rows || []);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка загрузки источников данных' });
    }
  });

  app.post('/api/expense-sources', async (req, res) => {
    try {
      const { name, type, config } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ error: 'Название и тип обязательны' });
      }

      const result = await mockDb.query(
        'INSERT INTO expense_sources (name, type, config) VALUES ($1, $2, $3) RETURNING *',
        [name, type, JSON.stringify(config)]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка создания источника данных' });
    }
  });

  app.put('/api/expense-sources/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, config } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ error: 'Название и тип обязательны' });
      }

      const result = await mockDb.query(
        'UPDATE expense_sources SET name = $1, type = $2, config = $3 WHERE id = $4 RETURNING *',
        [name, type, JSON.stringify(config), id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Источник данных не найден' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка обновления источника данных' });
    }
  });

  app.post('/api/expense-sources/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Мокаем успешное тестирование
      const mockExpenses = [
        {
          date: '2024-01-15',
          amount: 1500.00,
          description: 'Тестовый расход 1',
          category: 'Офис'
        },
        {
          date: '2024-01-16',
          amount: 2300.50,
          description: 'Тестовый расход 2',
          category: 'Транспорт'
        }
      ];
      
      res.json({
        success: true,
        message: 'Тестирование прошло успешно',
        sampleData: mockExpenses
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка тестирования источника данных' });
    }
  });

  return app;
};

describe('API тесты для источников расходов', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/expense-sources', () => {
    it('должен возвращать список источников данных', async () => {
      const mockSources = [
        { id: 1, name: 'Банк 1', type: 'bank', config: {} },
        { id: 2, name: 'Файл CSV', type: 'csv', config: {} }
      ];
      
      mockDb.query.mockResolvedValue({ rows: mockSources });

      const response = await request(app)
        .get('/api/expense-sources')
        .expect(200);

      expect(response.body).toEqual(mockSources);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM expense_sources ORDER BY name');
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/expense-sources')
        .expect(500);

      expect(response.body).toEqual({ error: 'Ошибка загрузки источников данных' });
    });
  });

  describe('POST /api/expense-sources', () => {
    it('должен создавать новый источник данных', async () => {
      const newSource = {
        name: 'Новый банк',
        type: 'bank',
        config: { apiKey: 'test-key' }
      };

      const createdSource = { id: 3, ...newSource };
      mockDb.query.mockResolvedValue({ rows: [createdSource] });

      const response = await request(app)
        .post('/api/expense-sources')
        .send(newSource)
        .expect(201);

      expect(response.body).toEqual(createdSource);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO expense_sources (name, type, config) VALUES ($1, $2, $3) RETURNING *',
        [newSource.name, newSource.type, JSON.stringify(newSource.config)]
      );
    });

    it('должен возвращать ошибку при отсутствии обязательных полей', async () => {
      const invalidSource = { name: 'Банк без типа' };

      const response = await request(app)
        .post('/api/expense-sources')
        .send(invalidSource)
        .expect(400);

      expect(response.body).toEqual({ error: 'Название и тип обязательны' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/expense-sources/:id', () => {
    it('должен обновлять существующий источник данных', async () => {
      const updatedSource = {
        name: 'Обновленный банк',
        type: 'bank',
        config: { apiKey: 'updated-key' }
      };

      const resultSource = { id: 1, ...updatedSource };
      mockDb.query.mockResolvedValue({ rows: [resultSource] });

      const response = await request(app)
        .put('/api/expense-sources/1')
        .send(updatedSource)
        .expect(200);

      expect(response.body).toEqual(resultSource);
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE expense_sources SET name = $1, type = $2, config = $3 WHERE id = $4 RETURNING *',
        [updatedSource.name, updatedSource.type, JSON.stringify(updatedSource.config), '1']
      );
    });

    it('должен возвращать 404 для несуществующего источника', async () => {
      const updatedSource = {
        name: 'Несуществующий банк',
        type: 'bank',
        config: {}
      };

      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/expense-sources/999')
        .send(updatedSource)
        .expect(404);

      expect(response.body).toEqual({ error: 'Источник данных не найден' });
    });
  });

  describe('POST /api/expense-sources/:id/test', () => {
    it('должен успешно тестировать источник данных', async () => {
      const response = await request(app)
        .post('/api/expense-sources/1/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Тестирование прошло успешно');
      expect(response.body.sampleData).toHaveLength(2);
      expect(response.body.sampleData[0]).toHaveProperty('date');
      expect(response.body.sampleData[0]).toHaveProperty('amount');
      expect(response.body.sampleData[0]).toHaveProperty('description');
      expect(response.body.sampleData[0]).toHaveProperty('category');
    });
  });
});