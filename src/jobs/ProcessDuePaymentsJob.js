/**
 * Фоновая задача для автоматической оплаты платежей в назначенную дату
 * Запускается ежедневно в 09:00
 */

import cron from 'node-cron';
import pkg from 'pg';
const { Pool } = pkg;
import { format, startOfDay, isEqual } from 'date-fns';

// Используем тот же pool что и в server.js
let pool;

export class ProcessDuePaymentsJob {
  static instance = null;
  isRunning = false;
  cronJob = null;

  /**
   * Получить экземпляр задачи (Singleton)
   */
  static getInstance() {
    if (!ProcessDuePaymentsJob.instance) {
      ProcessDuePaymentsJob.instance = new ProcessDuePaymentsJob();
    }
    return ProcessDuePaymentsJob.instance;
  }

  /**
   * Установить pool для работы с базой данных
   */
  static setPool(dbPool) {
    pool = dbPool;
  }

  /**
   * Запустить автоматическое выполнение задачи
   * Каждый день в 09:00
   */
  start() {
    if (this.cronJob) {
      console.log('ProcessDuePaymentsJob is already running');
      return;
    }

    // Запускаем каждый день в 08:00
    this.cronJob = cron.schedule('0 9 * * *', async () => {
      await this.execute();
    }, {
      scheduled: true,
      timezone: 'Europe/Chisinau' // Часовой пояс Молдовы
    });

    console.log('ProcessDuePaymentsJob scheduled to run daily at 09:00');
  }

  /**
   * Остановить автоматическое выполнение задачи
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('ProcessDuePaymentsJob stopped');
    }
  }

  /**
   * Выполнить задачу сейчас (ручной запуск)
   */
  async execute() {
    if (this.isRunning) {
      return {
        success: false,
        processedCount: 0,
        totalDuePayments: 0,
        errors: ['Job is already running']
      };
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`[${format(startTime, 'yyyy-MM-dd HH:mm:ss')}] ProcessDuePaymentsJob started`);

    let processedCount = 0;
    let totalDuePayments = 0;
    const errors = [];

    try {
      // Получаем все платежи со статусом 'scheduled' с наступившей датой оплаты
      const duePayments = await this.findDuePayments();
      totalDuePayments = duePayments.length;
      
      console.log(`Found ${totalDuePayments} due payments to process`);

      // Обрабатываем каждый платеж
      for (const payment of duePayments) {
        try {
          const result = await this.processPayment(payment);
          if (result.success) {
            processedCount++;
            console.log(`Payment ${payment.id} processed successfully`);
          } else {
            errors.push(`Payment ${payment.id}: ${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Payment ${payment.id}: ${errorMessage}`);
          console.error(`Error processing payment ${payment.id}:`, error);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`[${format(endTime, 'yyyy-MM-dd HH:mm:ss')}] ProcessDuePaymentsJob completed`);
      console.log(`Duration: ${duration}ms, Processed: ${processedCount} payments, Errors: ${errors.length}`);

      return {
        success: true,
        processedCount,
        totalDuePayments,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Job execution failed: ${errorMessage}`);
      console.error('ProcessDuePaymentsJob failed:', error);
      
      return {
        success: false,
        processedCount,
        totalDuePayments,
        errors
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Найти платежи со статусом 'scheduled' с наступившей датой оплаты
   */
  async findDuePayments() {
    if (!pool) {
      throw new Error('Database pool not initialized');
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    
    const query = `
      SELECT id, credit_id, due_date as payment_date, total_due as amount, status, period_number
      FROM credit_payment 
      WHERE status = 'scheduled' 
        AND due_date <= $1
      ORDER BY due_date ASC
    `;
    
    const result = await pool.query(query, [today]);
    return result.rows;
  }

  /**
   * Обработать один платеж - изменить статус на 'paid'
   */
  async processPayment(payment) {
    if (!pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const query = `
        UPDATE credit_payment 
        SET status = 'paid', 
            paid_at = CURRENT_TIMESTAMP,
            paid_amount = total_due,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'scheduled'
        RETURNING *
      `;
      
      const result = await pool.query(query, [payment.id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Payment not found or already processed'
        };
      }

      console.log(`Payment ${payment.id} status changed from 'scheduled' to 'paid'`);
      
      return {
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Получить статус задачи
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null
    };
  }
}

/**
 * Инициализация задачи при запуске приложения
 */
export function initializePaymentProcessingJob(dbPool) {
  // Устанавливаем pool для работы с базой данных
  ProcessDuePaymentsJob.setPool(dbPool);
  
  const job = ProcessDuePaymentsJob.getInstance();
  
  // Запускаем автоматическое выполнение
  job.start();
  
  // Добавляем graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping ProcessDuePaymentsJob');
    job.stop();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping ProcessDuePaymentsJob');
    job.stop();
  });
}

/**
 * API endpoint для ручного запуска задачи (удалена - теперь в server.js)
 */
export function setupPaymentProcessingRoutes(app) {
  console.log('[ProcessDuePaymentsJob] Setting up routes...');
  console.log('[ProcessDuePaymentsJob] App object type:', typeof app);
  console.log('[ProcessDuePaymentsJob] App has router:', !!app._router);
  
  // Эта функция больше не нужна - маршруты настроены в server.js
  console.log('[ProcessDuePaymentsJob] Routes are now configured in server.js');
}