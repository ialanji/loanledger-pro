import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalculationMethod, CreditType } from '@/types/credit';
import { CreditTypeSelect } from '@/components/CreditTypeSelect';

interface Credit {
  id: string;
  contractNumber: string;
  principal: number;
  currency: string;
  bankId: number;
  bankName: string;
  method: string;
  creditType: CreditType;
  paymentDay: number;
  startDate: string;
  termMonths: number;
  defermentMonths: number;
  initialRate: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface RateHistoryEntry {
  id?: number;
  rate: number;
  effectiveDate: string;
  notes?: string;
}

interface EditCreditFormData {
  creditType: CreditType;
  paymentDay: number;
  termMonths: number;
  defermentMonths: number;
  initialRate: number;
  notes: string;
  rateHistory: RateHistoryEntry[];
}

export default function EditCredit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [credit, setCredit] = useState<Credit | null>(null);
  const [hasPayments, setHasPayments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EditCreditFormData>({
    creditType: 'investment',
    paymentDay: 1,
    termMonths: 12,
    defermentMonths: 0,
    initialRate: 0,
    notes: '',
    rateHistory: []
  });

  useEffect(() => {
    fetchCreditData();
  }, [id]);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      
      // Fetch credit details
      const creditResponse = await fetch(`/api/credits/${id}`);
      if (!creditResponse.ok) {
        throw new Error('Credit not found');
      }
      const creditData = await creditResponse.json();

      // Normalize status: backend may not return it; assume 'active' by default
      const normalizedStatus = (creditData.status || 'active').toLowerCase();
      
      // Check if credit has payments
      const paymentsResponse = await fetch(`/api/credits/${id}/payments`);
      const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : [];
      const hasExistingPayments = Array.isArray(paymentsData) && paymentsData.length > 0;
      
      // Fetch rate history for floating methods
      let rateHistoryData: RateHistoryEntry[] = [];
      if (isFloating(creditData.method)) {
        const rateResponse = await fetch(`/api/credits/${id}/rates`);
        if (rateResponse.ok) {
          const rawRates = await rateResponse.json();
          console.log('Raw rates from API:', rawRates); // Для отладки
          
          rateHistoryData = (Array.isArray(rawRates) ? rawRates : []).map((rate: any) => {
            const entry = {
              id: rate.id,
              rate: typeof rate.rate === 'number' ? rate.rate * 100 : parseFloat(rate.rate || 0) * 100,
              effectiveDate: toIsoDate(rate.effective_date || rate.effectiveDate || rate.effectiveFrom || ''),
              notes: rate.notes || rate.note || '',
            };
            console.log('Mapped rate entry:', entry); // Для отладки
            return entry;
          });
        }
      }

      // Normalize credit fields (snake_case -> camelCase) to match UI expectations
      const normalizedCredit: Credit = {
        id: creditData.id,
        contractNumber: creditData.contract_number ?? creditData.contractNumber,
        principal: typeof creditData.principal === 'string' ? parseFloat(creditData.principal) : (creditData.principal ?? 0),
        currency: creditData.currency ?? 'L',
        bankId: creditData.bank_id ?? creditData.bankId ?? 0,
        bankName: creditData.bank_name ?? creditData.bankName ?? '',
        method: creditData.method,
        creditType: (creditData.credit_type ?? creditData.creditType ?? 'investment') as CreditType,
        paymentDay: creditData.payment_day ?? creditData.paymentDay ?? 1,
        startDate: toIsoDate(creditData.start_date ?? creditData.startDate ?? ''),
        termMonths: creditData.term_months ?? creditData.termMonths ?? 12,
        defermentMonths: creditData.deferment_months ?? creditData.defermentMonths ?? 0,
        // Keep initialRate in decimal on credit object; formData will use percentage
        initialRate: (creditData.initial_rate ?? creditData.initialRate ?? 0),
        status: normalizedStatus,
        notes: creditData.notes ?? '',
        createdAt: creditData.created_at ?? creditData.createdAt ?? '',
        updatedAt: creditData.updated_at ?? creditData.updatedAt ?? '',
      };

      setCredit(normalizedCredit);
      setHasPayments(hasExistingPayments);
      // When setting formData from fetched rate history, support effective_date/effectiveDate/effectiveFrom
      setFormData({
        creditType: normalizedCredit.creditType,
        paymentDay: normalizedCredit.paymentDay,
        termMonths: normalizedCredit.termMonths,
        defermentMonths: normalizedCredit.defermentMonths,
        initialRate: (creditData.initial_rate ?? creditData.initialRate ?? 0) * 100, // percentage for UI
        notes: normalizedCredit.notes,
        rateHistory: rateHistoryData
      });
      
      console.log('Final formData rateHistory:', rateHistoryData); // Для отладки
    } catch (error) {
      console.error('Error fetching credit data:', error);
      toast.error('Ошибка при загрузке данных кредита');
      navigate('/credits');
    } finally {
      setLoading(false);
    }
  };

  const getMethodLabel = (method: CalculationMethod | string) => {
    // Handle both enum values and string values from API
    switch (method) {
      case CalculationMethod.CLASSIC_ANNUITY:
      case 'classic_annuity':
      case 'CLASSIC_ANNUITY':
      case 'fixed':
        return 'Классический аннуитет';
      case CalculationMethod.CLASSIC_DIFFERENTIATED:
      case 'classic_differentiated':
      case 'CLASSIC_DIFFERENTIATED':
        return 'Классический дифференцированный';
      case CalculationMethod.FLOATING_ANNUITY:
      case 'floating_annuity':
      case 'FLOATING_ANNUITY':
        return 'Плавающий аннуитет';
      case CalculationMethod.FLOATING_DIFFERENTIATED:
      case 'floating_differentiated':
      case 'FLOATING_DIFFERENTIATED':
        return 'Плавающий дифференцированный';
      case 'floating':
        return 'Плавающий дифференцированный';
      default:
        return String(method);
    }
  };

  const handleInputChange = (field: keyof EditCreditFormData, value: any) => {
    // Fix decimal separator for rate field and convert to number
    if (field === 'initialRate' && typeof value === 'string') {
      const cleanValue = value.replace(',', '.');
      value = parseFloat(cleanValue);
      if (isNaN(value)) value = 0;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRateEntry = () => {
    const newRate: RateHistoryEntry = {
      rate: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      rateHistory: [...prev.rateHistory, newRate]
    }));
  };

  const updateRateEntry = (index: number, field: keyof RateHistoryEntry, value: any) => {
    console.log(`Updating rate entry ${index}, field: ${field}, value:`, value); // Для отладки
    
    // Fix decimal separator for rate field and convert to number
    if (field === 'rate') {
      if (typeof value === 'string') {
        const cleanValue = value.replace(',', '.');
        value = parseFloat(cleanValue);
        if (isNaN(value)) value = 0;
      } else if (typeof value === 'number') {
        // Значение уже число, оставляем как есть
        value = value;
      }
    }
    
    setFormData(prev => {
      const newRateHistory = [...prev.rateHistory];
      newRateHistory[index] = { ...newRateHistory[index], [field]: value };
      console.log(`Updated rate history:`, newRateHistory); // Для отладки
      return {
        ...prev,
        rateHistory: newRateHistory
      };
    });
  };

  const removeRateEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rateHistory: prev.rateHistory.filter((_, i) => i !== index)
    }));
  };

  // Helper: convert DD.MM.YYYY to YYYY-MM-DD (module scope)
  const toIsoDate = (dateStr: string) => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();

    // Already in YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Handle ISO strings with time component (e.g. 2025-01-01T00:00:00.000Z)
    if (s.includes('T')) {
      const [datePart] = s.split('T');
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    }

    // Handle DD.MM.YYYY
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
      const [day, month, year] = s.split('.');
      return `${year}-${month}-${day}`;
    }

    // Handle YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
      const [year, month, day] = s.split('/');
      return `${year}-${month}-${day}`;
    }

    // Fallback: return as-is (may be empty or unexpected format)
    return s;
  };
  
  // Helper: parse date-only string (YYYY-MM-DD) to Date without timezone shift
  const parseDateOnly = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Полдень для избежания смещений из‑за часовых поясов и DST
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credit) return;

    try {
      setSaving(true);

      // Validate rate history dates for floating methods (date-only comparison)
      if (isFloatingMethod && formData.rateHistory.length > 0) {
        const creditStartDateObj = parseDateOnly(credit.startDate);
        const invalidRates = formData.rateHistory.filter(rate => {
          if (!rate.effectiveDate) return false;
          const rateDate = parseDateOnly(toIsoDate(rate.effectiveDate));
          return rateDate < creditStartDateObj;
        });

        if (invalidRates.length > 0) {
          toast.error("Дата начала действия ставки не может быть раньше даты начала кредита");
          setSaving(false);
          return;
        }

        // Check that rate effective dates are in strictly increasing order
        const sortedDateStrings = formData.rateHistory
          .filter(r => !!r.effectiveDate)
          .map(r => toIsoDate(r.effectiveDate))
          .sort(); // YYYY-MM-DD строки корректно сортируются лексикографически

        for (let i = 1; i < sortedDateStrings.length; i++) {
          const prev = parseDateOnly(sortedDateStrings[i - 1]);
          const cur = parseDateOnly(sortedDateStrings[i]);
          if (cur <= prev) {
            toast.error('Даты ставок должны идти строго по возрастанию и не пересекаться');
            setSaving(false);
            return;
          }
        }
      }

      // ИСПРАВЛЕНИЕ: правильная подготовка данных истории ставок
      const preparedRateHistory = formData.rateHistory.map(rate => {
        console.log('Preparing rate entry:', rate); // Для отладки
        return {
          rate: typeof rate.rate === 'number' ? rate.rate / 100 : parseFloat(String(rate.rate)) / 100, // Convert percentage back to decimal
          effectiveDate: toIsoDate(rate.effectiveDate),
          notes: rate.notes || undefined,
        };
      });

      console.log('Prepared rate history for API:', preparedRateHistory); // Для отладки

      const updateData = {
        creditType: formData.creditType,
        paymentDay: formData.paymentDay,
        termMonths: formData.termMonths,
        defermentMonths: formData.defermentMonths,
        initialRate: formData.initialRate / 100, // Convert percentage back to decimal
        notes: formData.notes,
        rateHistory: preparedRateHistory
      };

      console.log('Final update data:', updateData); // Для отладки

      const response = await fetch(`/api/credits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update credit');
      }

      const result = await response.json();
      
      // Show success message with schedule recalculation info
      if (result.scheduleRecalculated) {
        toast.success('Кредит успешно обновлен. График платежей пересчитан.');
      } else {
        toast.success('Кредит успешно обновлен.');
      }
      
      navigate('/credits');
    } catch (error) {
      console.error('Error updating credit:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении кредита');
    } finally {
      setSaving(false);
    }
  };

  const canEditField = (field: string): boolean => {
    if (!credit) return false;
    
    // Check if credit is active
    if (credit.status !== 'active') return false;
    
    // Notes can always be edited
    if (field === 'notes') return true;
    
    // Rate history can be edited for floating methods
    if (field === 'rateHistory') {
      return isFloating(credit.method);
    }
    
    // Initial rate can be edited for classic methods (only if no payments)
    if (field === 'initialRate') {
      return !hasPayments && isClassic(credit.method);
    }
    
    // Credit type can only be edited if no payments exist
    if (field === 'creditType') {
      return !hasPayments;
    }
    
    // Other fields can only be edited if no payments exist
    return !hasPayments;
  };

  const getFieldDisabledReason = (field: string): string => {
    if (!credit) return '';
    
    if (credit.status !== 'active') {
      return 'Редактирование доступно только для активных кредитов';
    }
    
    if (hasPayments) {
      if (field === 'notes') return '';
      if (field === 'rateHistory' && isFloating(credit.method)) {
        return '';
      }
      if (field === 'creditType') {
        return 'Невозможно изменить тип кредита при наличии платежей';
      }
      return 'После первого платежа можно редактировать только примечания и историю ставок (для плавающих методов)';
    }
    
    return '';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Кредит не найден</div>
        </div>
      </div>
    );
  }

  // Normalize method helpers
  function isFloating(method: string | CalculationMethod) {
    const m = String(method);
    return m === String(CalculationMethod.FLOATING_ANNUITY)
      || m === String(CalculationMethod.FLOATING_DIFFERENTIATED)
      || m === 'floating'
      || m === 'floating_annuity'
      || m === 'floating_differentiated'
      || m === 'FLOATING_ANNUITY'
      || m === 'FLOATING_DIFFERENTIATED';
  }
  
  function isClassic(method: string | CalculationMethod) {
    const m = String(method);
    return m === String(CalculationMethod.CLASSIC_ANNUITY)
      || m === String(CalculationMethod.CLASSIC_DIFFERENTIATED)
      || m === 'fixed'
      || m === 'classic_annuity'
      || m === 'classic_differentiated'
      || m === 'CLASSIC_ANNUITY'
      || m === 'CLASSIC_DIFFERENTIATED';
  }
  const isFloatingMethod = isFloating(credit.method);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/credits')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку
        </Button>
        <h1 className="text-2xl font-bold">Редактирование кредита</h1>
      </div>

      {credit.status !== 'active' && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Редактирование доступно только для активных кредитов. Текущий статус: {credit.status}
          </AlertDescription>
        </Alert>
      )}

      {hasPayments && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            После первого платежа можно редактировать только примечания и историю ставок (для плавающих методов).
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Credit Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о кредите</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Номер договора</Label>
                <Input value={credit.contractNumber} disabled />
                <p className="text-sm text-gray-500 mt-1">Нельзя изменить после создания</p>
              </div>
              <div>
                <Label>Сумма кредита</Label>
                <Input value={`${credit.principal.toLocaleString()} ${credit.currency}`} disabled />
                <p className="text-sm text-gray-500 mt-1">Нельзя изменить после создания</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Банк</Label>
                <Input value={credit.bankName} disabled />
                <p className="text-sm text-gray-500 mt-1">Нельзя изменить</p>
              </div>
              <div>
                <Label>Метод расчета</Label>
                <Input value={getMethodLabel(credit.method)} disabled />
                <p className="text-sm text-gray-500 mt-1">Нельзя изменить после создания</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="creditType">Тип кредита</Label>
              <CreditTypeSelect
                value={formData.creditType}
                onValueChange={(value) => handleInputChange('creditType', value)}
                disabled={!canEditField('creditType')}
              />
              {!canEditField('creditType') && (
                <p className="text-sm text-gray-500 mt-1">{getFieldDisabledReason('creditType')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editable Fields Card */}
        <Card>
          <CardHeader>
            <CardTitle>Редактируемые параметры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentDay">День платежа</Label>
                <Input
                  id="paymentDay"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.paymentDay}
                  onChange={(e) => handleInputChange('paymentDay', parseInt(e.target.value))}
                  disabled={!canEditField('paymentDay')}
                />
                {!canEditField('paymentDay') && (
                  <p className="text-sm text-gray-500 mt-1">{getFieldDisabledReason('paymentDay')}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="termMonths">Срок (месяцы)</Label>
                <Input
                  id="termMonths"
                  type="number"
                  min="1"
                  value={formData.termMonths}
                  onChange={(e) => handleInputChange('termMonths', parseInt(e.target.value))}
                  disabled={!canEditField('termMonths')}
                />
                {!canEditField('termMonths') && (
                  <p className="text-sm text-gray-500 mt-1">{getFieldDisabledReason('termMonths')}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defermentMonths">Отсрочка (месяцы)</Label>
                <Input
                  id="defermentMonths"
                  type="number"
                  min="0"
                  value={formData.defermentMonths}
                  onChange={(e) => handleInputChange('defermentMonths', parseInt(e.target.value))}
                  disabled={!canEditField('defermentMonths')}
                />
                {!canEditField('defermentMonths') && (
                  <p className="text-sm text-gray-500 mt-1">{getFieldDisabledReason('defermentMonths')}</p>
                )}
              </div>

              {!isFloatingMethod && (
                <div>
                  <Label htmlFor="initialRate">Процентная ставка (%)</Label>
                  <Input
                    id="initialRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.initialRate}
                    onChange={(e) => handleInputChange('initialRate', e.target.value)}
                    disabled={!canEditField('initialRate')}
                  />
                  {!canEditField('initialRate') && (
                    <p className="text-sm text-gray-500 mt-1">{getFieldDisabledReason('initialRate')}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={!canEditField('notes')}
                rows={3}
              />
              {!canEditField('notes') && (
                <p className="text-sm text-gray-500 mt-1">{getFieldDisabledReason('notes')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rate History Card for Floating Methods */}
        {isFloatingMethod && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                История ставок
                {canEditField('rateHistory') && (
                  <Button type="button" variant="outline" size="sm" onClick={addRateEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить ставку
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!canEditField('rateHistory') && (
                <p className="text-sm text-gray-500 mb-4">{getFieldDisabledReason('rateHistory')}</p>
              )}
              
              <div className="space-y-4">
                {formData.rateHistory.map((rate, index) => (
                  <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label>Ставка (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={rate.rate}
                        onChange={(e) => updateRateEntry(index, 'rate', e.target.value)}
                        disabled={!canEditField('rateHistory')}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label>Дата вступления в силу</Label>
                      <Input
                        type="date"
                        value={rate.effectiveDate}
                        onChange={(e) => updateRateEntry(index, 'effectiveDate', e.target.value)}
                        disabled={!canEditField('rateHistory')}
                        min={credit.startDate}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label>Примечание</Label>
                      <Input
                        value={rate.notes || ''}
                        onChange={(e) => updateRateEntry(index, 'notes', e.target.value)}
                        disabled={!canEditField('rateHistory')}
                      />
                    </div>
                    
                    {canEditField('rateHistory') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRateEntry(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {formData.rateHistory.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    История ставок пуста
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/credits')}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving || credit.status !== 'active'}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </div>
  );
}