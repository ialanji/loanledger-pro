import { useState } from 'react';
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
  MapPin,
  Phone,
  Globe
} from 'lucide-react';

// Mock data
const mockBanks = [
  {
    id: '1',
    name: 'Moldova Agroindbank',
    code: 'MAIB',
    swift: 'AGRNMD2X',
    address: 'str. Cosmonautilor 7, Chisinau',
    phone: '+373 22 270 270',
    website: 'https://www.maib.md',
    creditsCount: 12,
    totalAmount: 2450000.00
  },
  {
    id: '2',
    name: 'Banca de Economii',
    code: 'BEM',
    swift: 'BEMRMD22',
    address: 'bd. Stefan cel Mare 8, Chisinau',
    phone: '+373 22 221 111',
    website: 'https://www.bem.md',
    creditsCount: 8,
    totalAmount: 1850000.00
  },
  {
    id: '3',
    name: 'ProCredit Bank',
    code: 'PCB',
    swift: 'PCRB MD22',
    address: 'str. Timisoara 35, Chisinau',
    phone: '+373 22 270 900',
    website: 'https://www.procreditbank.md',
    creditsCount: 5,
    totalAmount: 980000.00
  }
];

const initialBankForm = {
  name: '',
  code: '',
  swift: '',
  address: '',
  phone: '',
  website: ''
};

export default function Banks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [bankForm, setBankForm] = useState(initialBankForm);

  const filteredBanks = mockBanks.filter(bank =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    console.log('Saving bank:', bankForm);
    // TODO: Implement save logic
    setIsDialogOpen(false);
    setBankForm(initialBankForm);
    setEditingBank(null);
  };

  const handleEdit = (bank: any) => {
    setEditingBank(bank);
    setBankForm({
      name: bank.name,
      code: bank.code,
      swift: bank.swift,
      address: bank.address,
      phone: bank.phone,
      website: bank.website
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (bankId: string) => {
    console.log('Deleting bank:', bankId);
    // TODO: Implement delete logic
  };

  const resetForm = () => {
    setBankForm(initialBankForm);
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
                  value={bankForm.name}
                  onChange={(e) => setBankForm({...bankForm, name: e.target.value})}
                  placeholder="Например: Moldova Agroindbank"
                />
              </div>
              <div>
                <Label htmlFor="code">Код банка</Label>
                <Input
                  id="code"
                  value={bankForm.code}
                  onChange={(e) => setBankForm({...bankForm, code: e.target.value})}
                  placeholder="Например: MAIB"
                />
              </div>
              <div>
                <Label htmlFor="swift">SWIFT код</Label>
                <Input
                  id="swift"
                  value={bankForm.swift}
                  onChange={(e) => setBankForm({...bankForm, swift: e.target.value})}
                  placeholder="Например: AGRNMD2X"
                />
              </div>
              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={bankForm.address}
                  onChange={(e) => setBankForm({...bankForm, address: e.target.value})}
                  placeholder="Улица, город"
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={bankForm.phone}
                  onChange={(e) => setBankForm({...bankForm, phone: e.target.value})}
                  placeholder="+373 22 XXX XXX"
                />
              </div>
              <div>
                <Label htmlFor="website">Веб-сайт</Label>
                <Input
                  id="website"
                  value={bankForm.website}
                  onChange={(e) => setBankForm({...bankForm, website: e.target.value})}
                  placeholder="https://example.com"
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
              {bank.swift && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">SWIFT:</span>
                  <span className="font-mono">{bank.swift}</span>
                </div>
              )}
              
              {bank.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{bank.address}</span>
                </div>
              )}
              
              {bank.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{bank.phone}</span>
                </div>
              )}
              
              {bank.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={bank.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Веб-сайт
                  </a>
                </div>
              )}

              <div className="pt-3 border-t border-border/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Кредитов</p>
                    <p className="font-semibold text-primary">{bank.creditsCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Сумма</p>
                    <p className="font-semibold financial-amount">
                      {(bank.totalAmount / 1000).toFixed(0)}K MDL
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBanks.length === 0 && (
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