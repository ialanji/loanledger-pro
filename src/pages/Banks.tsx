import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Building2, 
  Edit, 
  Trash2,
  Phone
} from 'lucide-react';

interface Bank {
  id: string;
  name: string;
  code: string;
  country?: string;
  currency_code?: string;
  contact_info?: string | { phone?: string; website?: string };
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const initialFormData = {
  name: '',
  code: '',
  country: '',
  currency_code: '',
  contact_info: '',
  notes: ''
};

export default function Banks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch banks from API
  const fetchBanks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/banks');
      if (!response.ok) {
        throw new Error('Failed to fetch banks');
      }
      const banksData = await response.json();
      setBanks(banksData);
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    try {
      const url = editingBank 
        ? `/api/banks/${editingBank.id}`
        : '/api/banks';
      
      const method = editingBank ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save bank');
      }

      // Refresh banks list
      await fetchBanks();
      
      // Reset form and close dialog
      setFormData(initialFormData);
      setEditingBank(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving bank:', error);
    }
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      code: bank.code || '',
      country: bank.country || '',
      currency_code: bank.currency_code || '',
      contact_info: typeof bank.contact_info === 'string' 
        ? bank.contact_info 
        : bank.contact_info 
          ? `Телефон: ${bank.contact_info.phone || ''}\nСайт: ${bank.contact_info.website || ''}`
          : '',
      notes: bank.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (bankId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот банк?')) {
      try {
        const response = await fetch(`/api/banks/${bankId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete bank');
        }

        // Refresh banks list
        await fetchBanks();
      } catch (error) {
        console.error('Error deleting bank:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingBank(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Банки</h1>
          <p className="text-muted-foreground mt-2">
            Управление банками-партнерами
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-corporate gap-2">
              <Plus className="h-4 w-4" />
              Добавить банк
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBank ? 'Редактировать банк' : 'Добавить новый банк'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Название банка *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Например: Moldova Agroindbank"
                />
              </div>
              <div>
                <Label htmlFor="code">Код банка</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="Например: MAIB"
                />
              </div>
              <div>
                <Label htmlFor="country">Страна</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  placeholder="Например: Moldova"
                />
              </div>
              <div>
                <Label htmlFor="currency_code">Код валюты</Label>
                <Input
                  id="currency_code"
                  value={formData.currency_code}
                  onChange={(e) => setFormData({...formData, currency_code: e.target.value})}
                  placeholder="MDL, USD, EUR..."
                />
              </div>
              <div>
                <Label htmlFor="contact_info">Контактная информация</Label>
                <Input
                  id="contact_info"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                  placeholder="Телефон, email или адрес"
                />
              </div>
              <div>
                <Label htmlFor="notes">Заметки</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Дополнительная информация"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1 btn-corporate">
                  {editingBank ? 'Сохранить' : 'Создать'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Сбросить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск по названию или коду банка..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Banks Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Загрузка банков...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanks.map((bank) => (
            <Card key={bank.id} className="stat-card">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bank.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{bank.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(bank)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(bank.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bank.country && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Страна:</span>
                    <span>{bank.country}</span>
                  </div>
                )}
                
                {bank.currency_code && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Валюта:</span>
                    <span className="font-mono">{bank.currency_code}</span>
                  </div>
                )}
                
                {bank.contact_info && (
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">Контакты:</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {typeof bank.contact_info === 'string' ? (
                        <span>{bank.contact_info}</span>
                      ) : (
                        <>
                          {bank.contact_info.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Телефон:</span>
                              <span>{bank.contact_info.phone}</span>
                            </div>
                          )}
                          {bank.contact_info.website && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Сайт:</span>
                              <span>{bank.contact_info.website}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {bank.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-medium">Заметки:</span>
                    <span className="text-muted-foreground">{bank.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredBanks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Банки не найдены</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Попробуйте изменить критерии поиска' : 'Начните с добавления первого банка'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsDialogOpen(true)} className="btn-corporate">
                Добавить первый банк
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}