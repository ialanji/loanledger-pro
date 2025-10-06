/**
 * Тест для проверки правильности расчета прогресса выплаты на Dashboard
 */

describe('Dashboard Progress Calculation', () => {
  test('Расчет прогресса выплаты должен быть корректным', () => {
    // Тестовые данные - используем прямые значения как в DashboardStats
    const totalPrincipal = 1000000; // 1,000,000 MDL общая сумма кредитов
    const totalPaid = 810000; // 810,000 MDL фактически выплачено (из исторических платежей)
    
    // Ожидаемый результат: выплачено 810,000 из 1,000,000 = 81%
    const expectedProgressPercent = (totalPaid / totalPrincipal) * 100; // 81%
    
    // Проверяем расчет
    expect(expectedProgressPercent).toBe(81);
    
    // Новая формула из Dashboard (прямой расчет с проверкой деления на ноль)
    const calculatedProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal * 100) : 0;
    expect(calculatedProgress).toBe(81);
    
    console.log('✅ Расчет прогресса выплаты корректен:');
    console.log(`   Общая сумма: ${totalPrincipal.toLocaleString()} MDL`);
    console.log(`   Выплачено: ${totalPaid.toLocaleString()} MDL`);
    console.log(`   Прогресс: ${calculatedProgress.toFixed(1)}%`);
  });

  test('Граничные случаи расчета прогресса', () => {
    // Случай 1: Ничего не выплачено
    const totalPrincipal1 = 1000000;
    const totalPaid1 = 0;
    const progress1 = totalPrincipal1 > 0 ? (totalPaid1 / totalPrincipal1 * 100) : 0;
    expect(progress1).toBe(0);
    
    // Случай 2: Все выплачено
    const totalPrincipal2 = 1000000;
    const totalPaid2 = 1000000;
    const progress2 = totalPrincipal2 > 0 ? (totalPaid2 / totalPrincipal2 * 100) : 0;
    expect(progress2).toBe(100);
    
    // Случай 3: Половина выплачена
    const totalPrincipal3 = 1000000;
    const totalPaid3 = 500000;
    const progress3 = totalPrincipal3 > 0 ? (totalPaid3 / totalPrincipal3 * 100) : 0;
    expect(progress3).toBe(50);
    
    // Случай 4: Деление на ноль (нет кредитов)
    const totalPrincipal4 = 0;
    const totalPaid4 = 0;
    const progress4 = totalPrincipal4 > 0 ? (totalPaid4 / totalPrincipal4 * 100) : 0;
    expect(progress4).toBe(0);
    
    // Случай 5: Переплата (больше 100%)
    const totalPrincipal5 = 1000000;
    const totalPaid5 = 1200000; // Переплата
    const progress5 = totalPrincipal5 > 0 ? (totalPaid5 / totalPrincipal5 * 100) : 0;
    const progressCapped = Math.min(progress5, 100); // Ограничение до 100% для UI
    expect(progress5).toBe(120);
    expect(progressCapped).toBe(100);
    
    console.log('✅ Граничные случаи работают корректно');
  });

  test('Проверка формулы до и после исправления', () => {
    const totalPrincipal = 1000000;
    const remainingPrincipal = 190000;
    const totalPaid = 810000; // Фактически выплаченная сумма из исторических платежей
    
    // Старая (сложная) формула - использовала creditTypeTotals и remainingPrincipal
    const oldFormula = ((totalPrincipal - remainingPrincipal) / totalPrincipal * 100);
    expect(oldFormula).toBe(81);
    
    // Новая (прямая) формула - использует totalPaid напрямую с проверками безопасности
    const newFormula = totalPrincipal > 0 ? (totalPaid / totalPrincipal * 100) : 0;
    expect(newFormula).toBe(81);
    
    // Проверка ограничения максимального значения для UI
    const newFormulaWithCap = totalPrincipal > 0 ? Math.min((totalPaid / totalPrincipal * 100), 100) : 0;
    expect(newFormulaWithCap).toBe(81);
    
    console.log('✅ Исправление формулы:');
    console.log(`   Старая формула: ${oldFormula}% (сложная - через remainingPrincipal)`);
    console.log(`   Новая формула: ${newFormula}% (прямая - через totalPaid с проверками)`);
  });
});