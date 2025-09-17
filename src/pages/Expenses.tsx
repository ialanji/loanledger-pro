import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Receipt, Building, Users, Zap, Car, Coffee } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

const mockExpenses = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    category: 'Аренда',
    description: 'Месячная аренда офиса',
    amount: 12000,
    supplier: 'ООО "Недвижимость Плюс"',
    paymentMethod: 'Банковский перевод',
    status: 'Оплачен',
    invoiceNumber: 'RENT-2024-01',
    approvedBy: 'Иван Иванов'
  },
  {
    id: '2',
    date: new Date('2024-01-14'),
    category: 'Канцтовары',
    description: 'Офисные принадлежности',
    amount: 1200,
    supplier: 'ИП Петров А.С.',
    paymentMethod: 'Наличные',
    status: 'Оплачен',
    invoiceNumber: 'OFF-2024-15',
    approvedBy: 'Мария Петрова'
  },
  {
    id: '3',
    date: new Date('2024-01-13'),
    category: 'Коммунальные',
    description: 'Электроэнергия за декабрь',
    amount: 2800,
    supplier: 'АО "Молдэлектрика"',
    paymentMethod: 'Банковский перевод',
    status: 'В ожидании',
    invoiceNumber: 'ELC-2023-12',
    approvedBy: 'Иван Иванов'
  },
  {
    id: '4',
    date: new Date('2024-01-12'),
    category: 'Транспорт',
    description: 'Топливо для служебного автомобиля',
    amount: 800,
    supplier: 'Petrom Moldova',
    paymentMethod: 'Корпоративная карта',
    status: 'Оплачен',
    invoiceNumber: 'FUEL-2024-08',
    approvedBy: 'Сергей Сидоров'
  },
  {
    id: '5',
    date: new Date('2024-01-11'),
    category: 'Питание',
    description: 'Корпоративный обед',
    amount: 450,
    supplier: 'Кафе "У Марии"',
    paymentMethod: 'Наличные',
    status: 'Оплачен',
    invoiceNumber: 'MEAL-2024-03',
    approvedBy: 'Мария Петрова'
  }
];

const categoryConfig = {
  'Аренда': { icon: Building, color: 'bg-blue-100 text-blue-800' },
  'Канцтовары': { icon: Receipt, color: 'bg-green-100 text-green-800' },
  'Коммунальные': { icon: Zap, color: 'bg-yellow-100 text-yellow-800' },
  'Транспорт': { icon: Car, color: 'bg-purple-100 text-purple-800' },
  'Питание': { icon: Coffee, color: 'bg-orange-100 text-orange-800' },
  'Персонал': { icon: Users, color: 'bg-indigo-100 text-indigo-800' }
};

const statusConfig = {
  'Оплачен': { label: 'Оплачен', variant: 'default' as const },
  'В ожидании': { label: 'В ожидании', variant: 'secondary' as const },
  'Отклонен': { label: 'Отклонен', variant: 'destructive' as const },
};

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const filteredExpenses = mockExpenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === '' || expense.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalExpenses = mockExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidExpenses = mockExpenses.filter(expense => expense.status === 'Оплачен').reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = mockExpenses.filter(expense => expense.status === 'В ожидании').reduce((sum, expense) => sum + expense.amount, 0);

  const expensesByCategory = mockExpenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    acc[expense.category] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Затраты</h1>
          <p className="text-muted-foreground">Учет всех затрат предприятия</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Добавить затрату
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Новая затрата</DialogTitle>
              <DialogDescription>Добавить новую запись о затрате предприятия</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Категория</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Аренда</SelectItem>
                      <SelectItem value="office">Канцтовары</SelectItem>
                      <SelectItem value="utilities">Коммунальные</SelectItem>
                      <SelectItem value="transport">Транспорт</SelectItem>
                      <SelectItem value="food">Питание</SelectItem>
                      <SelectItem value="staff">Персонал</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Сумма</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Input id="description" placeholder="Описание затраты" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Поставщик</Label>
                  <Input id="supplier" placeholder="Название поставщика" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invoice">№ Счета/Накладной</Label>
                  <Input id="invoice" placeholder="Номер документа" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="payment">Способ оплаты</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите способ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="transfer">Банковский перевод</SelectItem>
                      <SelectItem value="card">Корпоративная карта</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="approver">Утверждающий</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ivanov">Иван Иванов</SelectItem>
                      <SelectItem value="petrova">Мария Петрова</SelectItem>
                      <SelectItem value="sidorov">Сергей Сидоров</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea id="notes" placeholder="Дополнительные сведения" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общие затраты</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">За текущий период</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оплачено</CardTitle>
            <Building className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(paidExpenses)}</div>
            <p className="text-xs text-muted-foreground">Выплаченные средства</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">К оплате</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingExpenses)}</div>
            <p className="text-xs text-muted-foreground">Ожидает оплаты</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Категорий</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</div>
            <p className="text-xs text-muted-foreground">Активных категорий</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Затраты по категориям</CardTitle>
            <CardDescription>Распределение затрат за текущий период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(expensesByCategory).map(([category, amount]) => {
                const config = categoryConfig[category] || { icon: Receipt, color: 'bg-gray-100 text-gray-800' };
                const IconComponent = config.icon;
                const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-muted-foreground">{percentage}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">{formatCurrency(amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>Поиск и фильтрация затрат</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск затрат..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все категории</SelectItem>
                  {Object.keys(categoryConfig).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все статусы</SelectItem>
                  <SelectItem value="Оплачен">Оплачен</SelectItem>
                  <SelectItem value="В ожидании">В ожидании</SelectItem>
                  <SelectItem value="Отклонен">Отклонен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список затрат</CardTitle>
          <CardDescription>
            Подробная информация о всех затратах предприятия
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Поставщик</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Утверждающий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const categoryConfig_ = categoryConfig[expense.category] || { icon: Receipt, color: 'bg-gray-100 text-gray-800' };
                const IconComponent = categoryConfig_.icon;
                
                return (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{expense.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="font-mono font-medium text-red-600">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>{expense.supplier}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[expense.status]?.variant || 'secondary'}>
                        {statusConfig[expense.status]?.label || expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{expense.approvedBy}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}