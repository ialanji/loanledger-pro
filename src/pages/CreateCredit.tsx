import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalculationMethod } from '@/types/credit';
import { ScheduleEngine } from '@/services/schedule-engine';
import { useToast } from '@/hooks/use-toast';

interface CreditFormData {
  contractNumber: string;
  principal: string;
  currencyCode: string;
  bankId: string;
  method: CalculationMethod | '';
  paymentDay: string;
  startDate: string;
  termMonths: string;
  defermentMonths: string;
  initialRate: string;
  rateEffectiveDate: string;
  notes: string;
}

interface RateEntry {
  id: string;
  annualPercent: string;
  effectiveDate: string;
  note: string;
}

const mockBanks = [
  { id: '1', name: 'Moldindconbank', code: 'MICB' },
  { id: '2', name: 'Banca Transilvania MD', code: 'BTMD' },
  { id: '3', name: 'Victoriabank', code: 'VICT' },
  { id: '4', name: 'Maib', code: 'MAIB' },
  { id: '5', name: 'EuroCreditBank', code: 'EUCB' }
];

export default function CreateCredit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<CreditFormData>({
    contractNumber: '',
    principal: '',
    currencyCode: 'MDL',
    bankId: '',
    method: '',
    paymentDay: '15',
    startDate: new Date().toISOString().split('T')[0],
    termMonths: '',
    defermentMonths: '0',
    initialRate: '',
    rateEffectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [rateHistory, setRateHistory] = useState<RateEntry[]>([]);

  const updateFormData = (field: keyof CreditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRateEntry = () => {
    const newRate: RateEntry = {
      id: Date.now().toString(),
      annualPercent: '',
      effectiveDate: formData.startDate,
      note: ''
    };
    setRateHistory(prev => [...prev, newRate]);
  };

  const updateRateEntry = (id: string, field: keyof Omit<RateEntry, 'id'>, value: string) => {
    setRateHistory(prev => prev.map(rate => 
      rate.id === id ? { ...rate, [field]: value } : rate
    ));
  };

  const removeRateEntry = (id: string) => {
    setRateHistory(prev => prev.filter(rate => rate.id !== id));
  };

  const isFloatingMethod = formData.method === CalculationMethod.FLOATING_ANNUITY || 
                          formData.method === CalculationMethod.FLOATING_DIFFERENTIATED;

  const generatePreview = () => {
    if (!formData.principal || !formData.method || !formData.termMonths) {
      toast({
        title: "Ошибка",
        description: "Заполните основные поля для предварительного просмотра",
        variant: "destructive"
      });
      return;
    }

    setShowPreview(true);
    toast({
      title: "Предварительный расчёт",
      description: "График платежей рассчитан успешно"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Здесь будет вызов API для создания кредита
      await new Promise(resolve => setTimeout(resolve, 2000)); // Имитация API

      toast({
        title: "Кредит создан",
        description: `Договор ${formData.contractNumber} успешно добавлен в систему`
      });

      navigate('/credits');
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать кредит. Попробуйте ещё раз.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodLabel = (method: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/credits')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Новый кредит</h1>
          <p className="text-muted-foreground mt-1">
            Создание нового кредитного договора
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
              <CardDescription>Общие данные о кредитном договоре</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Номер договора *</Label>
                <Input
                  id="contractNumber"
                  value={formData.contractNumber}
                  onChange={(e) => updateFormData('contractNumber', e.target.value)}
                  placeholder="CR-2024-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="principal">Сумма кредита *</Label>
                <div className="relative">
                  <Input
                    id="principal"
                    type="number"
                    step="0.01"
                    value={formData.principal}
                    onChange={(e) => updateFormData('principal', e.target.value)}
                    placeholder="500000"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    {formData.currencyCode}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank">Банк *</Label>
                <Select value={formData.bankId} onValueChange={(value) => updateFormData('bankId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockBanks.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name} ({bank.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <Select value={formData.currencyCode} onValueChange={(value) => updateFormData('currencyCode', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MDL">MDL - Молдавский лей</SelectItem>
                    <SelectItem value="USD">USD - Доллар США</SelectItem>
                    <SelectItem value="EUR">EUR - Евро</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Параметры расчёта</CardTitle>
              <CardDescription>Метод расчёта и условия кредита</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Метод расчёта *</Label>
                <Select value={formData.method} onValueChange={(value) => updateFormData('method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите метод" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CalculationMethod.CLASSIC_ANNUITY}>
                      {getMethodLabel(CalculationMethod.CLASSIC_ANNUITY)}
                    </SelectItem>
                    <SelectItem value={CalculationMethod.CLASSIC_DIFFERENTIATED}>
                      {getMethodLabel(CalculationMethod.CLASSIC_DIFFERENTIATED)}
                    </SelectItem>
                    <SelectItem value={CalculationMethod.FLOATING_ANNUITY}>
                      {getMethodLabel(CalculationMethod.FLOATING_ANNUITY)}
                    </SelectItem>
                    <SelectItem value={CalculationMethod.FLOATING_DIFFERENTIATED}>
                      {getMethodLabel(CalculationMethod.FLOATING_DIFFERENTIATED)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDay">День платежа</Label>
                <Input
                  id="paymentDay"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.paymentDay}
                  onChange={(e) => updateFormData('paymentDay', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Дата начала *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateFormData('startDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="termMonths">Срок (месяцев) *</Label>
                <Input
                  id="termMonths"
                  type="number"
                  min="1"
                  value={formData.termMonths}
                  onChange={(e) => updateFormData('termMonths', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defermentMonths">Отсрочка (месяцев)</Label>
                <Input
                  id="defermentMonths"
                  type="number"
                  min="0"
                  value={formData.defermentMonths}
                  onChange={(e) => updateFormData('defermentMonths', e.target.value)}
                />
              </div>

              {!isFloatingMethod && (
                <div className="space-y-2">
                  <Label htmlFor="initialRate">Процентная ставка (%) *</Label>
                  <Input
                    id="initialRate"
                    type="number"
                    step="0.01"
                    value={formData.initialRate}
                    onChange={(e) => updateFormData('initialRate', e.target.value)}
                    placeholder="12.50"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rate History for Floating Methods */}
          {isFloatingMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  История процентных ставок
                  <Info className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Для плавающих методов требуется история изменений процентных ставок
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rateHistory.map((rate, index) => (
                    <div key={rate.id} className="flex items-end gap-3 p-4 border border-border/50 rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Ставка (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={rate.annualPercent}
                            onChange={(e) => updateRateEntry(rate.id, 'annualPercent', e.target.value)}
                            placeholder="12.50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Дата начала действия</Label>
                          <Input
                            type="date"
                            value={rate.effectiveDate}
                            onChange={(e) => updateRateEntry(rate.id, 'effectiveDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Примечание</Label>
                          <Input
                            value={rate.note}
                            onChange={(e) => updateRateEntry(rate.id, 'note', e.target.value)}
                            placeholder="Базовая ставка НБМ + 2%"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRateEntry(rate.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRateEntry}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить ставку
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Дополнительные примечания</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Особые условия, комментарии..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={generatePreview}
                className="w-full"
                disabled={!formData.principal || !formData.method}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Предварительный расчёт
              </Button>
              
              <Button
                type="submit"
                className="w-full btn-corporate"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Создание...' : 'Создать кредит'}
              </Button>
            </CardContent>
          </Card>

          {/* Calculation Preview */}
          {showPreview && formData.principal && formData.termMonths && (
            <Card>
              <CardHeader>
                <CardTitle>Расчётные данные</CardTitle>
                <CardDescription>Предварительный расчёт</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Сумма кредита:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('ro-MD').format(Number(formData.principal))} {formData.currencyCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Срок:</span>
                  <span className="font-semibold">{formData.termMonths} мес.</span>
                </div>
                {formData.initialRate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ставка:</span>
                    <span className="font-semibold">{formData.initialRate}%</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Примерный ежемесячный платёж:</span>
                    <span className="font-bold text-primary">
                      {new Intl.NumberFormat('ro-MD').format(
                        Math.round(Number(formData.principal) * 1.1 / Number(formData.termMonths))
                      )} {formData.currencyCode}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Плавающие методы</strong> поддерживают ежедневное начисление процентов 
              и изменение ставок в течение срока кредита.
            </AlertDescription>
          </Alert>
        </div>
      </form>
    </div>
  );
}