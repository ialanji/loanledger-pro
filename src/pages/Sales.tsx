import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ShoppingCart, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

// Удалены моки - данные будут загружаться из API

interface Sale {
  id: string;
  date: Date;
  customerName: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  invoiceNumber: string;
}

const statusConfig = {
  'Оплачен': { label: 'Оплачен', variant: 'default' as const },
  'В ожидании': { label: 'В ожидании', variant: 'secondary' as const },
  'Просрочен': { label: 'Просрочен', variant: 'destructive' as const },
};

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // TODO: Загрузка данных из API
    setLoading(false);
  }, []);
  
  const filteredSales = sales.filter(sale => 
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const paidSales = sales.filter(sale => sale.status === 'Оплачен').reduce((sum, sale) => sum + sale.totalAmount, 0);
  const pendingSales = sales.filter(sale => sale.status === 'В ожидании').reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Продажи</h1>
          <p className="text-muted-foreground">Управление продажами предприятия</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Добавить продажу
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Новая продажа</DialogTitle>
              <DialogDescription>Добавить новую запись о продаже</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer">Клиент</Label>
                  <Input id="customer" placeholder="Название клиента" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invoice">№ Накладной</Label>
                  <Input id="invoice" placeholder="INV-2024-XXX" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product">Товар/Услуга</Label>
                <Input id="product" placeholder="Название товара или услуги" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Количество</Label>
                  <Input id="quantity" type="number" placeholder="1" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Цена за единицу</Label>
                  <Input id="price" type="number" placeholder="0.00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment">Способ оплаты</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="transfer">Банковский перевод</SelectItem>
                      <SelectItem value="card">Банковская карта</SelectItem>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общие продажи</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">За текущий период</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оплаченные</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidSales)}</div>
            <p className="text-xs text-muted-foreground">Поступившие средства</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В ожидании</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingSales)}</div>
            <p className="text-xs text-muted-foreground">Ожидает оплаты</p>
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
                placeholder="Поиск по клиенту, товару, накладной..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список продаж</CardTitle>
          <CardDescription>
            История всех продаж предприятия
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Товар/Услуга</TableHead>
                <TableHead>Количество</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Способ оплаты</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>№ Накладной</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">
                    {formatDate(sale.date)}
                  </TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.product}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(sale.totalAmount)}
                  </TableCell>
                  <TableCell>{sale.paymentMethod}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[sale.status]?.variant || 'secondary'}>
                      {statusConfig[sale.status]?.label || sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {sale.invoiceNumber}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}