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
import { Plus, Search, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

const mockTransactions = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    type: 'Приход',
    amount: 30000,
    source: 'Оплата по накладной INV-2024-001',
    method: 'Банковский перевод',
    category: 'Продажи',
    description: 'Оплата от ООО "Молдавский Торговый Дом"',
    balance: 155000
  },
  {
    id: '2',
    date: new Date('2024-01-14'),
    type: 'Расход',
    amount: 5000,
    source: 'Закупка расходных материалов',
    method: 'Наличные',
    category: 'Материалы',
    description: 'Канцелярские товары и расходники',
    balance: 125000
  },
  {
    id: '3',
    date: new Date('2024-01-13'),
    type: 'Приход',
    amount: 2500,
    source: 'Сервисное обслуживание',
    method: 'Наличные',
    category: 'Услуги',
    description: 'Оплата от ИП Попович С.М.',
    balance: 130000
  },
  {
    id: '4',
    date: new Date('2024-01-12'),
    type: 'Расход',
    amount: 12000,
    source: 'Аренда офиса',
    method: 'Банковский перевод',
    category: 'Аренда',
    description: 'Месячная аренда за январь',
    balance: 127500
  }
];

const typeConfig = {
  'Приход': { 
    label: 'Приход', 
    variant: 'default' as const, 
    icon: ArrowDownLeft,
    color: 'text-green-600'
  },
  'Расход': { 
    label: 'Расход', 
    variant: 'secondary' as const, 
    icon: ArrowUpRight,
    color: 'text-red-600'
  }
};

export default function CashDesk() {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = transactionType === '' || transaction.type === transactionType;
    
    return matchesSearch && matchesType;
  });

  const totalIncome = mockTransactions.filter(t => t.type === 'Приход').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = mockTransactions.filter(t => t.type === 'Расход').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Касса</h1>
          <p className="text-muted-foreground">Приход денег: наличка и переводы</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Новая операция
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Новая кассовая операция</DialogTitle>
              <DialogDescription>Добавить приход или расход денежных средств</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Тип операции</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Приход</SelectItem>
                      <SelectItem value="expense">Расход</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Сумма</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">Источник/Назначение</Label>
                <Input id="source" placeholder="Описание операции" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="method">Способ оплаты</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите способ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="transfer">Банковский перевод</SelectItem>
                      <SelectItem value="card">Банковская карта</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Категория</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Продажи</SelectItem>
                      <SelectItem value="services">Услуги</SelectItem>
                      <SelectItem value="materials">Материалы</SelectItem>
                      <SelectItem value="rent">Аренда</SelectItem>
                      <SelectItem value="other">Прочее</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea id="description" placeholder="Дополнительные сведения" />
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Текущий баланс</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentBalance)}</div>
            <p className="text-xs text-muted-foreground">Доступные средства</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Приход</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">За текущий период</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Расход</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-muted-foreground">За текущий период</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск операций..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={transactionType === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType('')}
              >
                Все
              </Button>
              <Button
                variant={transactionType === 'Приход' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType('Приход')}
                className="gap-2"
              >
                <ArrowDownLeft className="w-3 h-3" />
                Приход
              </Button>
              <Button
                variant={transactionType === 'Расход' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType('Расход')}
                className="gap-2"
              >
                <ArrowUpRight className="w-3 h-3" />
                Расход
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>История операций</CardTitle>
          <CardDescription>
            Все движения денежных средств
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Источник/Назначение</TableHead>
                <TableHead>Способ</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Баланс</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const config = typeConfig[transaction.type];
                const IconComponent = config.icon;
                
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-4 h-4 ${config.color}`} />
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${config.color}`}>
                      {transaction.type === 'Расход' ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{transaction.source}</TableCell>
                    <TableCell>{transaction.method}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(transaction.balance)}
                    </TableCell>
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