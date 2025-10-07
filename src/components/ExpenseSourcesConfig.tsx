import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, RefreshCw, Play, TestTube, Settings, History, FileSpreadsheet, Download, Upload, ExternalLink, Save, CheckCircle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { importExpensesFromSource, getImportHistory, ImportResult } from '@/lib/postgresql/expenseImport'
import { ImportTestResult, ImportLog } from '@/types/postgresql.types'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { z } from 'zod'

const EXPENSE_CATEGORIES = [
  { value: 'salary', label: 'Зарплата', description: 'Данные о зарплатах сотрудников' },
  { value: 'transport', label: 'Транспорт', description: 'Расходы на ГСМ, ремонты и пр.' },
  { value: 'supplies', label: 'Канцтовары', description: 'Закупка канцелярии и материалов' },
  { value: 'other', label: 'Прочие расходы', description: 'Административные и операционные затраты' }
] as const

const DEFAULT_COLUMN_MAPPINGS = {
  // Salariul (Зарплаты)
  salary: {
    // Core fields (backward compatible)
    date: 'A',
    employee: 'B',
    department: 'C',
    amount: 'D',
    description: 'E',
    // Extended fields
    employee_name: '',
    birth_date: '',
    idno: '',
    department_group: '',
    month: '',
    year: '',
    position: '',
    hire_date: '',
    norm_days: '',
    worked_days: '',
    absent_days: '',
    vacation_days: '',
    sick_days: '',
    salary_fixed: '',
    salary_calculated: '',
    bonus_premii: '',
    kpi: '',
    premii_extra: '',
    bonus_promo: '',
    salary_net: '',
    taxes: '',
    salary_total: '',
    car_number: ''
  },
  // TransportExpense (Транспортные затраты)
  transport: {
    // Core fields (backward compatible)
    date: 'A',
    vehicle: 'B',
    type: 'C',
    amount: 'D',
    description: 'E',
    // Existing optional fields
    distance: '',
    fuel_type: '',
    driver: '',
    route: '',
    // Extended fields from schema
    day: '',
    month: '',
    year: '',
    doc_number: '',
    company: '',
    organization: '',
    vehicle_number: '',
    responsible_person: '',
    department: '',
    transport_ownership: '',
    repair_or_fuel: '',
    odometer: '',
    item_name: '',
    quantity: '',
    price: ''
  },
  // Rechizite (Канцтовары / supplies)
  supplies: {
    // Core fields (backward compatible)
    date: 'A',
    item: 'B',
    supplier: 'C',
    amount: 'D',
    description: 'E',
    // Existing optional fields
    quantity: '',
    unit_price: '',
    department: '',
    // Extended fields from schema
    operation: '',
    invoice_number: '',
    month: '',
    year: ''
  },
  // Cheltueli (Прочие расходы)
  other: {
    // Core fields (backward compatible)
    date: 'A',
    category: 'B',
    supplier: 'C',
    amount: 'D',
    description: 'E',
    // Extended fields from schema
    invoice_number: '',
    month: '',
    year: '',
    organization: '',
    department: '',
    department_group: '',
    responsible_person: '',
    item_name: '',
    expense_group: '',
    expense_subgroup: '',
    quantity: '',
    price: ''
  }
}

export default function ExpenseSourcesConfig({ onImportComplete }: { onImportComplete?: () => void }) {
  const [sources, setSources] = useState<ExpenseSource[]>([])
  const [selectedSource, setSelectedSource] = useState<ExpenseSource | null>(null)
  const [formData, setFormData] = useState<ExpenseSourceFormData>({
    category: 'salary',
    sheet_url: '',
    import_mode: 'google_sheets',
    sheet_name: '',
    range_start: 'A2',
    range_end: '',
    column_mapping: DEFAULT_COLUMN_MAPPINGS.salary,
    is_active: true,
    import_settings: {},
    validation_rules: {}
  })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ImportTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const importIntervalRef = useRef<number | null>(null)
  const [importHistory, setImportHistory] = useState<ImportLog[]>([])
  const [activeTab, setActiveTab] = useState('sources')

  // Zod schema for Google Sheets URL
  const sheetUrlSchema = z
    .string()
    .trim()
    .min(1, 'Укажите ссылку на Google Sheet')
    .url('Некорректный формат URL')
    .regex(/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/, 'Ссылка должна содержать /spreadsheets/d/<ID>')

  const sheetUrlValidation = sheetUrlSchema.safeParse(formData.sheet_url)
  const isSheetUrlValid = sheetUrlValidation.success

  useEffect(() => {
    loadSources()
  }, [])

  useEffect(() => {
    if (selectedSource) {
      loadImportHistory()
    }
  }, [selectedSource])

  useEffect(() => {
    // cleanup interval on unmount
    return () => {
      if (importIntervalRef.current) {
        window.clearInterval(importIntervalRef.current)
      }
    }
  }, [])

  // Helper: generate column letters A..AZ
  const generateColumnLetters = () => {
    const letters: string[] = []
    const toAZ = 26 + 26 // A..Z (26), AA..AZ (26)
    for (let i = 0; i < toAZ; i++) {
      const first = Math.floor(i / 26) - 1
      const second = i % 26
      const ch2 = String.fromCharCode('A'.charCodeAt(0) + second)
      letters.push(first >= 0 ? String.fromCharCode('A'.charCodeAt(0) + first) + ch2 : ch2)
    }
    return letters
  }
  const COLUMN_OPTIONS = generateColumnLetters()

  const loadSources = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get('/expense-sources')
      setSources(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки источников')
    } finally {
      setLoading(false)
    }
  }

  const handleSourceSelect = (source: ExpenseSource) => {
    setSelectedSource(source)
    setFormData({
      category: source.category,
      sheet_url: source.sheet_url,
      import_mode: source.import_mode,
      sheet_name: source.sheet_name || '',
      range_start: source.range_start,
      range_end: source.range_end || '',
      column_mapping: source.column_mapping || DEFAULT_COLUMN_MAPPINGS[source.category],
      is_active: source.is_active,
      import_settings: source.import_settings || {},
      validation_rules: source.validation_rules || {}
    })
    setTestResult(null)
    setError(null)
    setSuccess(null)
  }

  const handleCategoryChange = (category: ExpenseSourceFormData['category']) => {
    setFormData(prev => ({
      ...prev,
      category,
      column_mapping: DEFAULT_COLUMN_MAPPINGS[category]
    }))
  }

  const handleColumnMappingChange = (field: string, column: string) => {
    setFormData(prev => ({
      ...prev,
      column_mapping: {
        ...prev.column_mapping,
        [field]: column === 'none' ? '' : column
      }
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const sourceData = {
        category: formData.category,
        sheet_url: formData.sheet_url,
        import_mode: formData.import_mode,
        sheet_name: formData.sheet_name || null,
        range_start: formData.range_start || 'A2',
        range_end: formData.range_end || null,
        column_mapping: formData.column_mapping,
        is_active: formData.is_active,
        import_settings: formData.import_settings || {},
        validation_rules: formData.validation_rules || {}
      }

      if (selectedSource) {
        // Update existing source
        await apiClient.put(`/expense-sources/${selectedSource.id}`, sourceData)
        setSuccess('Источник данных успешно обновлен')
      } else {
        // Create new source
        await apiClient.post('/expense-sources', sourceData)
        setSuccess('Источник данных успешно создан')
      }

      await loadSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  const handleTestImport = async () => {
    if (!selectedSource) return

    setTesting(true)
    setTestResult(null)
    setError(null)
    
    try {
      const result = await importExpensesFromSource(selectedSource.id, true)
      
      // The result in test mode should match ImportTestResult interface
      setTestResult(result as ImportTestResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка тестирования импорта')
    } finally {
      setTesting(false)
    }
  }

  // Perform actual import
  const handleImport = async () => {
    if (!selectedSource) return

    setImporting(true)
    setError(null)
    setImportProgress(0)

    // simulate progress until server responds
    if (importIntervalRef.current) {
      window.clearInterval(importIntervalRef.current)
    }
    importIntervalRef.current = window.setInterval(() => {
      setImportProgress((prev) => {
        const next = prev + Math.random() * 10
        return next < 90 ? next : 90
      })
    }, 500)
    
    try {
      const result = await importExpensesFromSource(selectedSource.id, false)
      const runResult = result as ImportResult

      if (runResult.success) {
        setSuccess(
          `Successfully imported ${runResult.imported_count || 0} expenses. Skipped ${runResult.skipped_count || 0} duplicates.`
        )
        if (runResult.warnings && runResult.warnings.length > 0) {
          setError(`Warnings: ${runResult.warnings.join(', ')}`)
        }
        
        // Вызываем callback для уведомления родительского компонента
        if (onImportComplete) {
          onImportComplete()
        }
      } else {
        const msg = (runResult.errors && runResult.errors.length > 0)
          ? runResult.errors.join(', ')
          : 'Unknown error'
        setError(`Import failed: ${msg}`)
      }

      // Finish progress
      setImportProgress(100)
      if (importIntervalRef.current) {
        window.clearInterval(importIntervalRef.current)
        importIntervalRef.current = null
      }

      // Refresh import history
      await loadImportHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      // reset progress after short delay
      setTimeout(() => setImportProgress(0), 800)
    }
  }

  // Load import history
  const loadImportHistory = async () => {
    if (!selectedSource) return

    try {
      const history = await getImportHistory(selectedSource.id, 10)
      setImportHistory(history)
    } catch (error) {
      console.error('Failed to load import history:', error)
    }
  }

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find(cat => cat.value === category)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Настройка источников данных</h2>
          <p className="text-muted-foreground">
            Управление источниками Google Sheets для импорта данных о затратах
          </p>
        </div>
        <Button onClick={loadSources} variant="outline" size="sm" disabled={importing}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sources">Источники</TabsTrigger>
          <TabsTrigger value="history">История импорта</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sources List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Источники данных</CardTitle>
            <CardDescription>
              Выберите источник для настройки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
            {sources.map((source) => {
              const categoryInfo = getCategoryInfo(source.category)
              return (
                <div
                  key={source.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSource?.id === source.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSourceSelect(source)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{categoryInfo?.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {source.import_mode === 'google_sheets' ? 'Google Sheets' : 'Файл'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {source.is_active ? (
                        <Badge variant="default" className="text-xs">Активен</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Неактивен</Badge>
                      )}
                      {source.last_import_at && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {sources.length === 0 && !loading && (
              <div className="text-sm text-muted-foreground text-center py-4">
                Источники данных не найдены
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              {selectedSource ? 'Редактирование источника' : 'Новый источник'}
            </CardTitle>
            <CardDescription>
              Настройте параметры импорта данных из Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Основные</TabsTrigger>
                <TabsTrigger value="mapping">Маппинг колонок</TabsTrigger>
                <TabsTrigger value="advanced">Дополнительно</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Категория</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={handleCategoryChange}
                      disabled={importing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div>
                              <div className="font-medium">{cat.label}</div>
                              <div className="text-xs text-muted-foreground">{cat.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="import_mode">Режим импорта</Label>
                    <Select 
                      value={formData.import_mode} 
                      onValueChange={(value: 'google_sheets' | 'file') => 
                        setFormData(prev => ({ ...prev, import_mode: value }))
                      }
                      disabled={importing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_sheets">
                          <div className="flex items-center">
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Google Sheets API
                          </div>
                        </SelectItem>
                        <SelectItem value="file">
                          <div className="flex items-center">
                            <Upload className="h-4 w-4 mr-2" />
                            Загрузка файла
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sheet_url">URL Google Sheets</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="sheet_url"
                      value={formData.sheet_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, sheet_url: e.target.value }))}
                      placeholder="https://docs.google.com/spreadsheets/d/17so5yEGE_R7BKNGoPfpXtma9c1zCi43B8l9BqDIgJuE/edit?usp=drive_link"
                      className={!isSheetUrlValid && formData.sheet_url ? 'border-red-300 focus-visible:ring-red-400' : ''}
                      disabled={importing}
                    />
                    {formData.sheet_url && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(formData.sheet_url, '_blank')}
                        disabled={!isSheetUrlValid || importing}
                        title={!isSheetUrlValid ? 'Укажите корректную ссылку' : 'Открыть в новой вкладке'}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="text-xs">
                    {!formData.sheet_url ? (
                      <span className="text-muted-foreground">Вставьте ссылку на таблицу Google Sheets</span>
                    ) : isSheetUrlValid ? (
                      <span className="text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Ссылка корректна</span>
                    ) : (
                      <span className="text-red-600">Некорректный URL. Пример: https://docs.google.com/spreadsheets/d/ID/edit</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheet_name">Название листа</Label>
                    <Input
                      id="sheet_name"
                      value={formData.sheet_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, sheet_name: e.target.value }))}
                      placeholder="Лист1"
                      disabled={importing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range_start">Начальная ячейка</Label>
                    <Input
                      id="range_start"
                      value={formData.range_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, range_start: e.target.value }))}
                      placeholder="A2"
                      disabled={importing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range_end">Конечная ячейка</Label>
                    <Input
                      id="range_end"
                      value={formData.range_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, range_end: e.target.value }))}
                      placeholder="Оставьте пустым для автоопределения"
                      disabled={importing}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    disabled={importing}
                  />
                  <Label htmlFor="is_active">Активный источник</Label>
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Укажите соответствие между колонками Google Sheets и полями базы данных
                  </div>
                  
                  {formData.column_mapping && Object.entries(formData.column_mapping).map(([field, column]) => (
                    <div key={field} className="grid grid-cols-2 gap-4 items-center">
                      <Label className="capitalize">{field}</Label>
                      <Select
                        value={(column as string) || 'none'}
                        onValueChange={(val) => handleColumnMappingChange(field, val)}
                        disabled={importing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите колонку" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {COLUMN_OPTIONS.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="import_settings">Настройки импорта (JSON)</Label>
                    <Textarea
                      id="import_settings"
                      value={JSON.stringify(formData.import_settings, null, 2)}
                      onChange={(e) => {
                        try {
                          const settings = JSON.parse(e.target.value)
                          setFormData(prev => ({ ...prev, import_settings: settings }))
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      placeholder='{"skip_empty_rows": true, "date_format": "DD.MM.YYYY"}'
                      rows={4}
                      disabled={importing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="validation_rules">Правила валидации (JSON)</Label>
                    <Textarea
                      id="validation_rules"
                      value={JSON.stringify(formData.validation_rules, null, 2)}
                      onChange={(e) => {
                        try {
                          const rules = JSON.parse(e.target.value)
                          setFormData(prev => ({ ...prev, validation_rules: rules }))
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      placeholder='{"required_fields": ["date", "amount"], "min_amount": 0}'
                      rows={4}
                      disabled={importing}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            {/* Test Import Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Тест импорта</h4>
                  <p className="text-sm text-muted-foreground">
                    Проверьте настройки перед сохранением
                  </p>
                </div>
                <Button 
                  onClick={handleTestImport} 
                  disabled={testing || !formData.sheet_url || !isSheetUrlValid || importing}
                  variant="outline"
                >
                  {testing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Тест импорта
                </Button>
              </div>

              {testResult && (
                <Alert className={testResult.success ? "border-green-200" : "border-red-200"}>
                  <div className="flex items-start space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    )}
                    <div className="space-y-2">
                      <AlertDescription>
                        {testResult.success 
                          ? `Успешно! Найдено ${testResult.total_rows} записей для импорта.`
                          : 'Ошибка при тестировании импорта.'
                        }
                      </AlertDescription>
                      
                      {testResult.preview_data.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium mb-1">Предварительный просмотр:</div>
                          <div className="text-xs bg-muted p-2 rounded">
                            {testResult.preview_data.slice(0, 3).map((row, idx) => (
                              <div key={idx} className="font-mono">
                                {JSON.stringify(row)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {testResult.warnings.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium mb-1">Предупреждения:</div>
                          <ul className="text-xs text-yellow-600 space-y-1">
                            {testResult.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={loading || !formData.sheet_url || !isSheetUrlValid || importing}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить
              </Button>
            </div>

            {/* Status Messages */}
            {error && (
              <Alert className="mt-4 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {selectedSource && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  История импорта
                </CardTitle>
                <CardDescription>
                  Последние импорты для источника "{getCategoryInfo(selectedSource.category)?.label}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Показаны последние 10 импортов
                    </div>
                    <Button 
                      onClick={handleImport} 
                      disabled={importing || !selectedSource.is_active}
                      size="sm"
                    >
                      {importing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {importing ? 'Импорт...' : 'Запустить импорт'}
                    </Button>
                  </div>

                  {importing && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Выполняется импорт данных...</div>
                      <Progress value={importProgress} className="h-2" />
                    </div>
                  )}

                  {importHistory.length > 0 ? (
                    <div className="space-y-3">
                      {importHistory.map((record, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(record.created_at).toLocaleString('ru-RU')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Импортировано: {record.imported_count} | Пропущено: {record.skipped_count}
                              </div>
                            </div>
                            <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                              {record.status === 'success' ? 'Успешно' : 'Ошибка'}
                            </Badge>
                          </div>
                          {record.errors && record.errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-600">
                              Ошибки: {record.errors.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      История импорта пуста
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedSource && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  Выберите источник данных для просмотра истории импорта
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}