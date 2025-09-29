import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Plus, Search, Filter, Download, Upload, Edit, Trash2, Eye, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { apiClient } from '@/lib/api';
import { Expense, ExpenseInsert, ExpenseUpdate } from '@/types/postgresql.types';
import { toast } from 'sonner';
import ExpenseSourcesConfig from '@/components/ExpenseSourcesConfig';

type ExpenseType = Expense;
type ExpenseInsertType = ExpenseInsert;
type ExpenseUpdateType = ExpenseUpdate;

// Категории расходов
const EXPENSE_CATEGORIES = [
  'Офисные расходы',
  'Транспорт',
  'Питание',
  'Маркетинг',
  'IT и связь',
  'Аренда',
  'Коммунальные услуги',
  'Канцелярия',
  'Обучение',
  'Прочее'
];

// Источники данных
const DATA_SOURCES = [
  'manual',
  'google_sheets',
  'bank_import',
  'api'
];

interface ExpenseFormData {
  source: string;
  date: Date;
  amount: number;
  currency: string;
  department: string;
  supplier: string;
  category: string;
  description: string;
}

interface ExpenseFilters {
  search: string;
  category: string;
  department: string;
  supplier: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  source: string;
}

export default function Expenses() {
  // Состояние данных
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояние UI
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseType | null>(null);

  // Состояние фильтров
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: '',
    department: '',
    supplier: '',
    dateFrom: null,
    dateTo: null,
    source: ''
  });

  // Состояние формы
  const [formData, setFormData] = useState<ExpenseFormData>({
    source: 'manual',
    date: new Date(),
    amount: 0,
    currency: 'MDL',
    department: '',
    supplier: '',
    category: '',
    description: ''
  });

  // Уникальные значения для фильтров
  const uniqueDepartments = useMemo(() => 
    [...new Set(expenses.map(e => e.department).filter(Boolean))], [expenses]
  );
  
  const uniqueSuppliers = useMemo(() => 
    [...new Set(expenses.map(e => e.supplier).filter(Boolean))], [expenses]
  );

  // Загрузка данных
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      const result = await apiClient.getExpenses();
      setExpenses(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      toast.error('Ошибка загрузки расходов');
    } finally {
      setLoading(false);
    }
  };

  // Авторизация (временно отключена для тестирования)
  const ensureAuth = async () => {
    try {
      // Временно пропускаем авторизацию для тестирования интерфейса
      console.log('Авторизация пропущена для тестирования');
      return true;
    } catch (error) {
      console.warn('Авторизация не удалась:', error);
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await ensureAuth();
        await fetchExpenses();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка авторизации');
        toast.error('Ошибка авторизации');
      }
    };
    init();
  }, []);

  // Фильтрация расходов
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = !filters.search || 
        expense.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        expense.supplier?.toLowerCase().includes(filters.search.toLowerCase()) ||
        expense.department?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesCategory = !filters.category || filters.category === 'all' || expense.category === filters.category;
      const matchesDepartment = !filters.department || filters.department === 'all' || expense.department === filters.department;
      const matchesSupplier = !filters.supplier || filters.supplier === 'all' || expense.supplier === filters.supplier;
      const matchesSource = !filters.source || filters.source === 'all' || expense.source === filters.source;

      const expenseDate = new Date(expense.date);
      const matchesDateFrom = !filters.dateFrom || expenseDate >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || expenseDate <= filters.dateTo;

      return matchesSearch && matchesCategory && matchesDepartment && 
             matchesSupplier && matchesSource && matchesDateFrom && matchesDateTo;
    });
  }, [expenses, filters]);

  // Статистика
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const count = filteredExpenses.length;
    const avgAmount = count > 0 ? total / count : 0;

    const categoryBreakdown = filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return { total, count, avgAmount, categoryBreakdown };
  }, [filteredExpenses]);

  // Обработчики форм
  const handleInputChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field: keyof ExpenseFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      source: 'manual',
      date: new Date(),
      amount: 0,
      currency: 'MDL',
      department: '',
      supplier: '',
      category: '',
      description: ''
    });
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      department: '',
      supplier: '',
      dateFrom: null,
      dateTo: null,
      source: ''
    });
  };

  // Валидация формы
  const validateForm = (): string | null => {
    if (!formData.amount || formData.amount <= 0) {
      return 'Сумма должна быть больше нуля';
    }
    if (!formData.category) {
      return 'Категория обязательна для заполнения';
    }
    if (!formData.date) {
      return 'Дата обязательна для заполнения';
    }
    return null;
  };

  // CRUD операции
  const handleAddExpense = async () => {
    // Валидация формы
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const expenseData: ExpenseInsertType = {
        source: formData.source,
        date: format(formData.date, 'yyyy-MM-dd'),
        amount: formData.amount,
        currency: formData.currency,
        department: formData.department || null,
        supplier: formData.supplier || null,
        category: formData.category,
        description: formData.description || null,
        row_hash: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      await apiClient.createExpense(expenseData);

      toast.success('Расход успешно добавлен');
      setIsAddDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (err) {
      toast.error('Ошибка при добавлении расхода');
      console.error(err);
    }
  };

  const handleEditExpense = async () => {
    if (!selectedExpense) return;

    // Валидация формы
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const expenseData: ExpenseUpdateType = {
        source: formData.source,
        date: format(formData.date, 'yyyy-MM-dd'),
        amount: formData.amount,
        currency: formData.currency,
        department: formData.department || null,
        supplier: formData.supplier || null,
        category: formData.category,
        description: formData.description || null
      };

      await apiClient.updateExpense(selectedExpense.id, expenseData);

      toast.success('Расход успешно обновлен');
      setIsEditDialogOpen(false);
      setSelectedExpense(null);
      resetForm();
      fetchExpenses();
    } catch (err) {
      toast.error('Ошибка при обновлении расхода');
      console.error(err);
    }
  };

  const handleDeleteExpense = async (expense: ExpenseType) => {
    if (!confirm('Вы уверены, что хотите удалить этот расход?')) return;

    try {
      await apiClient.deleteExpense(expense.id);
      toast.success('Расход успешно удален');
      fetchExpenses();
    } catch (err) {
      toast.error('Ошибка при удалении расхода');
      console.error(err);
    }
  };

  const openEditDialog = (expense: ExpenseType) => {
    setSelectedExpense(expense);
    setFormData({
      source: expense.source,
      date: new Date(expense.date),
      amount: expense.amount,
      currency: expense.currency,
      department: expense.department || '',
      supplier: expense.supplier || '',
      category: expense.category,
      description: expense.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (expense: ExpenseType) => {
    setSelectedExpense(expense);
    setIsViewDialogOpen(true);
  };

  // Обработчик импорта
  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    toast.loading('Обновление данных...', { id: 'import-refresh' });
    fetchExpenses().then(() => {
      toast.success('Данные обновлены', { id: 'import-refresh' });
      setIsImportDialogOpen(false);
    }).catch((error) => {
      toast.error('Ошибка при обновлении данных', { id: 'import-refresh' });
      console.error('Import refresh error:', error);
    });
  };

  // Форма расхода
  const ExpenseForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="source">Источник</Label>
          <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATA_SOURCES.map(source => (
                <SelectItem key={source} value={source}>
                  {source === 'manual' ? 'Ручной ввод' :
                   source === 'google_sheets' ? 'Google Sheets' :
                   source === 'bank_import' ? 'Банковский импорт' : 'API'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date">Дата операции</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.date, 'dd.MM.yyyy', { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date}
                onSelect={(date) => date && handleInputChange('date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Сумма</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="currency">Валюта</Label>
          <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MDL">MDL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="category">Категория</Label>
        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">Отдел</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            placeholder="Название отдела"
          />
        </div>

        <div>
          <Label htmlFor="supplier">Поставщик</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => handleInputChange('supplier', e.target.value)}
            placeholder="Название поставщика"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Дополнительная информация о расходе"
          rows={3}
        />
      </div>

      <Button onClick={onSubmit} className="w-full">
        {submitLabel}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton для заголовка */}
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        
        {/* Skeleton для статистики */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Skeleton для фильтров */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/6 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Skeleton для таблицы */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-200 animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Управление расходами</h1>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                Импорт
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Импорт расходов</DialogTitle>
              </DialogHeader>
              <ExpenseSourcesConfig onImportComplete={handleImportComplete} />
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Добавить расход
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Добавить новый расход</DialogTitle>
              </DialogHeader>
              <ExpenseForm onSubmit={handleAddExpense} submitLabel="Добавить расход" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Навигация по разделам */}
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
          <TabsTrigger value="sources">
            <Settings className="w-4 h-4 mr-2" />
            Источники данных
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общая сумма</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total.toLocaleString('ru-RU', { 
                style: 'currency', 
                currency: 'MDL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Количество</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Средняя сумма</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgAmount.toLocaleString('ru-RU', { 
                style: 'currency', 
                currency: 'MDL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Категории</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.categoryBreakdown).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Поиск по описанию..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filter-category">Категория</Label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {EXPENSE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-department">Отдел</Label>
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все отделы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все отделы</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-supplier">Поставщик</Label>
              <Select value={filters.supplier} onValueChange={(value) => handleFilterChange('supplier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все поставщики" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все поставщики</SelectItem>
                  {uniqueSuppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-source">Источник</Label>
              <Select value={filters.source} onValueChange={(value) => handleFilterChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все источники" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  {DATA_SOURCES.map(source => (
                    <SelectItem key={source} value={source}>
                      {source === 'manual' ? 'Ручной ввод' :
                       source === 'google_sheets' ? 'Google Sheets' :
                       source === 'bank_import' ? 'Банковский импорт' : 'API'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Фильтры по дате */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label>Дата с</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, 'dd.MM.yyyy', { locale: ru }) : 'Выберите дату'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom || undefined}
                    onSelect={(date) => handleFilterChange('dateFrom', date || null)}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Дата по</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, 'dd.MM.yyyy', { locale: ru }) : 'Выберите дату'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo || undefined}
                    onSelect={(date) => handleFilterChange('dateTo', date || null)}
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Таблица расходов */}
      <Card>
        <CardHeader>
          <CardTitle>Список расходов ({filteredExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Сумма</th>
                  <th className="text-left p-2">Категория</th>
                  <th className="text-left p-2">Отдел</th>
                  <th className="text-left p-2">Поставщик</th>
                  <th className="text-left p-2">Источник</th>
                  <th className="text-left p-2">Описание</th>
                  <th className="text-left p-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {format(new Date(expense.date), 'dd.MM.yyyy', { locale: ru })}
                    </td>
                    <td className="p-2 font-medium">
                      {expense.amount.toLocaleString('ru-RU', { 
                        style: 'currency', 
                        currency: expense.currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </td>
                    <td className="p-2">
                      <Badge variant="secondary">{expense.category}</Badge>
                    </td>
                    <td className="p-2">{expense.department || '-'}</td>
                    <td className="p-2">{expense.supplier || '-'}</td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {expense.source === 'manual' ? 'Ручной' :
                         expense.source === 'google_sheets' ? 'Sheets' :
                         expense.source === 'bank_import' ? 'Банк' : 'API'}
                      </Badge>
                    </td>
                    <td className="p-2 max-w-xs truncate">
                      {expense.description || '-'}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(expense)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(expense)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Расходы не найдены
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать расход</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSubmit={handleEditExpense} submitLabel="Сохранить изменения" />
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали расхода</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID</Label>
                  <div className="font-mono text-sm">{selectedExpense.id}</div>
                </div>
                <div>
                  <Label>Источник</Label>
                  <div>{selectedExpense.source}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Дата операции</Label>
                  <div>{format(new Date(selectedExpense.date), 'dd.MM.yyyy', { locale: ru })}</div>
                </div>
                <div>
                  <Label>Сумма</Label>
                  <div className="font-medium">
                    {selectedExpense.amount.toLocaleString('ru-RU', { 
                      style: 'currency', 
                      currency: selectedExpense.currency
                    })}
                  </div>
                </div>
              </div>

              <div>
                <Label>Категория</Label>
                <div><Badge variant="secondary">{selectedExpense.category}</Badge></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Отдел</Label>
                  <div>{selectedExpense.department || '-'}</div>
                </div>
                <div>
                  <Label>Поставщик</Label>
                  <div>{selectedExpense.supplier || '-'}</div>
                </div>
              </div>

              <div>
                <Label>Описание</Label>
                <div>{selectedExpense.description || '-'}</div>
              </div>

              <div>
                <Label>Дата создания</Label>
                <div className="text-sm text-gray-500">
                  {format(new Date(selectedExpense.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </div>
              </div>

              <div>
                <Label>Хеш строки</Label>
                <div className="font-mono text-xs text-gray-500">{selectedExpense.row_hash}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="sources">
          <ExpenseSourcesConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}