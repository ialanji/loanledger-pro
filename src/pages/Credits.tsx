import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Credit, CalculationMethod, CreditStatus } from '@/types/credit';
import { apiClient } from '@/lib/api';

export default function Credits() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreditStatus>('all');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  // Нормализация статуса из API в CreditStatus
  const normalizeStatus = (status: any): CreditStatus => {
    const s = typeof status === 'string' ? status.toLowerCase().trim() : '';
    switch (s) {
      case CreditStatus.ACTIVE:
        return CreditStatus.ACTIVE;
      case CreditStatus.CLOSED:
        return CreditStatus.CLOSED;
      case CreditStatus.OVERDUE:
        return CreditStatus.OVERDUE;
      default:
        return CreditStatus.ACTIVE;
    }
  };
  // Нормализация данных API: snake_case -> camelCase + приведение типов/дат
  const normalizeCredit = (credit: any): Credit => {
    const contractNumber = credit.contractNumber ?? credit.contract_number ?? '';
    const bankName = credit.bank?.name ?? credit.bank_name ?? '';
    const bankCode = credit.bank?.code ?? credit.bank_code ?? '';

    return {
      id: credit.id,
      contractNumber,
      principal: Number(credit.principal ?? 0),
      currencyCode: credit.currencyCode ?? credit.currency ?? credit.currency_code ?? 'MDL',
      bankId: credit.bankId ?? credit.bank_id,
      method: credit.method,
      paymentDay: Number(credit.paymentDay ?? credit.payment_day ?? 1),
      startDate: credit.startDate ? new Date(credit.startDate) : (credit.start_date ? new Date(credit.start_date) : undefined as any),
      termMonths: Number(credit.termMonths ?? credit.term_months ?? 0),
      defermentMonths: Number(credit.defermentMonths ?? credit.deferment_months ?? 0),
      status: normalizeStatus(credit.status ?? credit.credit_status ?? credit.current_state),
      createdAt: credit.createdAt ? new Date(credit.createdAt) : new Date(),
      updatedAt: credit.updatedAt ? new Date(credit.updatedAt) : new Date(),
      bank: bankName || bankCode ? {
        id: credit.bank?.id ?? credit.bankId ?? credit.bank_id ?? '',
        name: bankName,
        code: bankCode,
        swift: credit.bank?.swift,
        createdAt: credit.bank?.createdAt ? new Date(credit.bank.createdAt) : new Date(),
        updatedAt: credit.bank?.updatedAt ? new Date(credit.bank.updatedAt) : new Date(),
      } : undefined,
      rates: Array.isArray(credit.rates) ? credit.rates : [],
      adjustments: Array.isArray(credit.adjustments) ? credit.adjustments : [],
      payments: Array.isArray(credit.payments) ? credit.payments : [],
    } as Credit;
  };

  // Делаем функцию доступной для handleDelete и useEffect
  const fetchCredits = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // Используем общий apiClient с безопасным JSON-парсингом
      const data = await apiClient.get<any[]>('/credits', { signal });
      const normalized = (Array.isArray(data) ? data : []).map(normalizeCredit);
      setCredits(normalized);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Ошибка загрузки кредитов:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCredits(controller.signal);
    return () => controller.abort();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-MD', {
      style: 'currency',
      currency: 'MDL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const getMethodLabel = (method: CalculationMethod | string) => {
    // Handle both enum values and string values from API
    switch (method) {
      case CalculationMethod.CLASSIC_ANNUITY:
      case 'classic_annuity':
        return 'Классический аннуитет';
      case CalculationMethod.CLASSIC_DIFFERENTIATED:
      case 'classic_differentiated':
        return 'Классический дифференцированный';
      case CalculationMethod.FLOATING_ANNUITY:
      case 'floating_annuity':
        return 'Плавающий аннуитет';
      case CalculationMethod.FLOATING_DIFFERENTIATED:
      case 'floating_differentiated':
        return 'Плавающий дифференцированный';
      // DB currently stores just 'floating' for any floating method; reflect user's expected differentiated label
      case 'floating':
        return 'Плавающий дифференцированный';
      default:
        return method as string;
    }
  };

  const getStatusBadge = (status: CreditStatus) => {
    switch (status) {
      case CreditStatus.ACTIVE:
        return <Badge className="status-badge active">Активен</Badge>;
      case CreditStatus.OVERDUE:
        return <Badge className="status-badge overdue">Просрочен</Badge>;
      case CreditStatus.CLOSED:
        return <Badge className="status-badge">Закрыт</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDelete = async (creditId: string, contractNumber: string) => {
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить кредит ${contractNumber}?\n\nЭто действие нельзя отменить.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/credits/${creditId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          alert(errorData.message || 'Невозможно удалить кредит');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
      }

      // Обновляем список кредитов вместо перезагрузки страницы
      fetchCredits();
      
    } catch (error) {
      console.error('Error deleting credit:', error);
      alert('Произошла ошибка при удалении кредита. Попробуйте еще раз.');
    }
  };

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = !searchTerm ||
      credit.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.bank?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || credit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Кредиты</h1>
          <p className="text-muted-foreground mt-1">
            Управление кредитным портфелем
          </p>
        </div>
        <Button className="btn-corporate" onClick={() => navigate('/credits/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Новый кредит
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск по номеру договора или банку..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                Все ({credits.length})
              </Button>
              <Button 
                variant={statusFilter === CreditStatus.ACTIVE ? 'default' : 'outline'}
                onClick={() => setStatusFilter(CreditStatus.ACTIVE)}
                size="sm"
              >
                Активные ({credits.filter(c => c.status === CreditStatus.ACTIVE).length})
              </Button>
              <Button 
                variant={statusFilter === CreditStatus.OVERDUE ? 'default' : 'outline'}
                onClick={() => setStatusFilter(CreditStatus.OVERDUE)}
                size="sm"
              >
                Просроченные ({credits.filter(c => c.status === CreditStatus.OVERDUE).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список кредитов</CardTitle>
          <CardDescription>
            Найдено {filteredCredits.length} из {credits.length} кредитов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <p>Загрузка кредитов...</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Договор</th>
                  <th>Банк</th>
                  <th>Сумма</th>
                  <th>Метод расчёта</th>
                  <th>Дата начала</th>
                  <th>Срок</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredCredits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-muted/30 transition-colors">
                    <td className="font-mono font-medium">{credit.contractNumber}</td>
                    <td>
                      <div>
                        <p className="font-medium">{credit.bank?.name}</p>
                            <p className="text-xs text-muted-foreground">{credit.bank?.code}</p>
                      </div>
                    </td>
                    <td className="financial-amount text-right font-semibold">
                      {formatCurrency(credit.principal)}
                    </td>
                    <td>
                      <div>
                        <p className="text-sm">{getMethodLabel(credit.method)}</p>
                        {credit.defermentMonths > 0 && (
                          <p className="text-xs text-warning">
                            Отсрочка: {credit.defermentMonths} мес.
                          </p>
                        )}
                      </div>
                    </td>
                    <td>{formatDate(credit.startDate)}</td>
                    <td>
                      <div className="text-center">
                        <p className="font-medium">{credit.termMonths || 'Не указан'}</p>
                        <p className="text-xs text-muted-foreground">месяцев</p>
                      </div>
                    </td>
                    <td>{getStatusBadge(credit.status)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" title="Просмотр">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="График платежей" onClick={() => navigate(`/credits/${credit.id}/schedule`)}>
                          <Calculator className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Редактировать" onClick={() => navigate(`/credits/${credit.id}/edit`)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Удалить" className="text-destructive hover:text-destructive" onClick={() => handleDelete(credit.id, credit.contractNumber)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Общая сумма кредитов</p>
              <p className="text-2xl font-bold financial-amount">
                {formatCurrency(credits.reduce((sum, credit) => sum + credit.principal, 0))}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Средний размер кредита</p>
              <p className="text-2xl font-bold financial-amount">
                {formatCurrency(credits.length > 0 ? credits.reduce((sum, credit) => sum + credit.principal, 0) / credits.length : 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Средний срок</p>
              <p className="text-2xl font-bold">
                {Math.round(credits.length > 0 ? credits.reduce((sum, credit) => sum + credit.termMonths, 0) / credits.length : 0)}
                <span className="text-sm font-normal text-muted-foreground ml-1">мес.</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <Filter className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}