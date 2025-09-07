import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Credit, CalculationMethod, CreditStatus } from '@/types/credit';

// Mock data
const mockCredits: Credit[] = [
  {
    id: '1',
    contractNumber: 'CR-2024-001',
    principal: 500000,
    currencyCode: 'MDL',
    method: CalculationMethod.FLOATING_ANNUITY,
    paymentDay: 15,
    startDate: new Date('2024-01-01'),
    termMonths: 24,
    defermentMonths: 0,
    status: CreditStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    rates: [],
    adjustments: [],
    payments: [],
    bank: { id: '1', name: 'Moldindconbank', code: 'MICB', createdAt: new Date(), updatedAt: new Date() }
  },
  {
    id: '2',
    contractNumber: 'CR-2024-002',
    principal: 1200000,
    currencyCode: 'MDL',
    method: CalculationMethod.CLASSIC_DIFFERENTIATED,
    paymentDay: 20,
    startDate: new Date('2024-01-15'),
    termMonths: 36,
    defermentMonths: 3,
    status: CreditStatus.ACTIVE,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    rates: [],
    adjustments: [],
    payments: [],
    bank: { id: '2', name: 'Banca Transilvania MD', code: 'BTMD', createdAt: new Date(), updatedAt: new Date() }
  },
  {
    id: '3',
    contractNumber: 'CR-2023-089',
    principal: 750000,
    currencyCode: 'MDL',
    method: CalculationMethod.FLOATING_DIFFERENTIATED,
    paymentDay: 10,
    startDate: new Date('2023-12-01'),
    termMonths: 18,
    defermentMonths: 0,
    status: CreditStatus.OVERDUE,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-10'),
    rates: [],
    adjustments: [],
    payments: [],
    bank: { id: '3', name: 'Victoriabank', code: 'VICT', createdAt: new Date(), updatedAt: new Date() }
  }
];

export default function Credits() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-MD', {
      style: 'currency',
      currency: 'MDL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-MD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getMethodLabel = (method: CalculationMethod) => {
    switch (method) {
      case CalculationMethod.CLASSIC_ANNUITY:
        return 'Классический аннуитет';
      case CalculationMethod.CLASSIC_DIFFERENTIATED:
        return 'Классический дифференцированный';
      case CalculationMethod.FLOATING_ANNUITY:
        return 'Плавающий аннуитет';
      case CalculationMethod.FLOATING_DIFFERENTIATED:
        return 'Плавающий дифференцированный';
      default:
        return method;
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

  const filteredCredits = mockCredits.filter(credit => {
    const matchesSearch = credit.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credit.bank?.name.toLowerCase().includes(searchTerm.toLowerCase());
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
                Все ({mockCredits.length})
              </Button>
              <Button 
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              >
                Активные ({mockCredits.filter(c => c.status === 'active').length})
              </Button>
              <Button 
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('overdue')}
                size="sm"
              >
                Просроченные ({mockCredits.filter(c => c.status === 'overdue').length})
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
            Найдено {filteredCredits.length} из {mockCredits.length} кредитов
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                        <p className="font-medium">{credit.termMonths}</p>
                        <p className="text-xs text-muted-foreground">месяцев</p>
                      </div>
                    </td>
                    <td>{getStatusBadge(credit.status)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" title="Просмотр">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="График платежей">
                          <Calculator className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Редактировать">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Удалить" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Общая сумма кредитов</p>
              <p className="text-2xl font-bold financial-amount">
                {formatCurrency(mockCredits.reduce((sum, credit) => sum + credit.principal, 0))}
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
                {formatCurrency(mockCredits.reduce((sum, credit) => sum + credit.principal, 0) / mockCredits.length)}
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
                {Math.round(mockCredits.reduce((sum, credit) => sum + credit.termMonths, 0) / mockCredits.length)}
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