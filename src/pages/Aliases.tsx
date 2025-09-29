'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Download, Trash2, Edit, Search, Tag, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

interface Alias {
  id: number
  source_value: string
  normalized_value: string
  is_group: boolean
  type: 'department' | 'supplier'
  created_at: string
}

interface AliasTableProps {
  data: Alias[]
  selectedIds: Set<number>
  onToggleOne: (id: number) => void
  onToggleAll: (checked: boolean) => void
  onEdit: (alias: Alias) => void
  onRemove: (id: number) => void
}

function AliasTable({ data, selectedIds, onToggleOne, onToggleAll, onEdit, onRemove }: AliasTableProps) {
  const allIds = data.map(item => item.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label="Выбрать все"
              />
            </TableHead>
            <TableHead>Исходное значение</TableHead>
            <TableHead>Нормализованное значение</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Создано</TableHead>
            <TableHead className="w-24">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Нет данных для отображения
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onToggleOne(item.id)}
                    aria-label={`Выбрать ${item.source_value}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{item.source_value}</TableCell>
                <TableCell>{item.normalized_value}</TableCell>
                <TableCell>
                  <Badge variant={item.is_group ? "default" : "secondary"}>
                    {item.is_group ? 'Группа' : 'Элемент'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(item.created_at).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function Aliases() {
  const [departments, setDepartments] = useState<Alias[]>([])
  const [suppliers, setSuppliers] = useState<Alias[]>([])
  const [activeTab, setActiveTab] = useState<'departments' | 'suppliers'>('departments')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Alias | null>(null)
  const [form, setForm] = useState({
    source_value: '',
    normalized_value: '',
    is_group: false
  })
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const currentData = activeTab === 'departments' ? departments : suppliers
  
  const filteredDepartments = departments.filter(item => {
    const matchesSearch = item.source_value.toLowerCase().includes(search.toLowerCase()) ||
                         item.normalized_value.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'groups' && item.is_group) ||
                         (filter === 'items' && !item.is_group)
    return matchesSearch && matchesFilter
  })

  const filteredSuppliers = suppliers.filter(item => {
    const matchesSearch = item.source_value.toLowerCase().includes(search.toLowerCase()) ||
                         item.normalized_value.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'groups' && item.is_group) ||
                         (filter === 'items' && !item.is_group)
    return matchesSearch && matchesFilter
  })

  const toggleOne = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const allIds = currentData.map(item => item.id)
      setSelectedIds(new Set(allIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  const onTabChange = (value: string) => {
    setActiveTab(value as 'departments' | 'suppliers')
    setSelectedIds(new Set())
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ source_value: '', normalized_value: '', is_group: false })
    setDialogOpen(true)
  }

  const openEdit = (alias: Alias) => {
    setEditing(alias)
    setForm({
      source_value: alias.source_value,
      normalized_value: alias.normalized_value,
      is_group: alias.is_group
    })
    setDialogOpen(true)
  }

  const exportToCSV = () => {
    const data = activeTab === 'departments' ? filteredDepartments : filteredSuppliers
    const headers = ['ID', 'Исходное значение', 'Нормализованное значение', 'Группа', 'Создано']
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.id,
        `"${item.source_value}"`,
        `"${item.normalized_value}"`,
        item.is_group ? 'Да' : 'Нет',
        new Date(item.created_at).toLocaleDateString('ru-RU')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${activeTab}_aliases_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const removeSelected = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Вы уверены, что хотите удалить ${selectedIds.size} алиасов?`)) {
      return
    }

    setDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => 
        fetch(`/api/aliases/${id}`, { method: 'DELETE' })
      ))
      
      if (activeTab === 'departments') {
        setDepartments(departments.filter(d => !selectedIds.has(d.id)))
      } else {
        setSuppliers(suppliers.filter(s => !selectedIds.has(s.id)))
      }
      
      setSelectedIds(new Set())
      toast({
        title: "Успешно",
        description: `Удалено ${selectedIds.size} алиасов`,
      })
    } catch (error) {
      console.error('Remove selected failed', error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить выбранные алиасы",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const exportAllToCSV = async (type: string) => {
    try {
      const response = await fetch(`/api/aliases/export?type=${type}`)
      const data = await response.json()
      
      const headers = ['ID', 'Исходное значение', 'Нормализованное значение', 'Группа', 'Создано']
      const csvContent = [
        headers.join(','),
        ...data.map((item: Alias) => [
          item.id,
          `"${item.source_value}"`,
          `"${item.normalized_value}"`,
          item.is_group ? 'Да' : 'Нет',
          new Date(item.created_at).toLocaleDateString('ru-RU')
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${type}_aliases_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export all CSV failed', err)
    }
  }

  const remove = async (id: number) => {
    try {
      await fetch(`/api/aliases/${id}`, { method: 'DELETE' })
      if (activeTab === 'departments') {
        setDepartments(departments.filter(d => d.id !== id))
      } else {
        setSuppliers(suppliers.filter(s => s.id !== id))
      }
      setSelectedIds(new Set([...selectedIds].filter(selectedId => selectedId !== id)))
      toast({
        title: "Успешно",
        description: "Алиас удален",
      })
    } catch (error) {
      console.error('Remove alias failed', error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить алиас",
        variant: "destructive",
      })
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        type: activeTab === 'departments' ? 'department' : 'supplier'
      }

      if (editing) {
        await fetch(`/api/aliases/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (activeTab === 'departments') {
          setDepartments(departments.map(d => d.id === editing.id ? { ...d, ...payload } : d))
        } else {
          setSuppliers(suppliers.map(s => s.id === editing.id ? { ...s, ...payload } : s))
        }
        
        toast({
          title: "Успешно",
          description: "Алиас обновлен",
        })
      } else {
        const response = await fetch('/api/aliases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const newAlias = await response.json()
        
        if (activeTab === 'departments') {
          setDepartments([...departments, newAlias])
        } else {
          setSuppliers([...suppliers, newAlias])
        }
        
        toast({
          title: "Успешно",
          description: "Алиас создан",
        })
      }
      
      setDialogOpen(false)
      setEditing(null)
      setForm({ source_value: '', normalized_value: '', is_group: false })
    } catch (error) {
      console.error('Save alias failed', error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить алиас",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const loadAliases = async () => {
      try {
        const [deptResponse, suppResponse] = await Promise.all([
          fetch('/api/aliases?type=department'),
          fetch('/api/aliases?type=supplier')
        ])
        
        const [deptData, suppData] = await Promise.all([
          deptResponse.json(),
          suppResponse.json()
        ])
        
        setDepartments(deptData)
        setSuppliers(suppData)
      } catch (error) {
        console.error('Load aliases failed', error)
      }
    }
    
    loadAliases()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Алиасы</h2>
          <p className="text-muted-foreground">Управление соответствиями для департаментов и поставщиков</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAllToCSV(activeTab)} className="ml-2">
            <Download className="mr-2 h-4 w-4" /> Экспорт всех
          </Button>
          <Button variant="destructive" size="sm" onClick={removeSelected} disabled={selectedIds.size === 0 || deleting} className="ml-2">
            {deleting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Удалить выбранные ({selectedIds.size})
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Добавить алиас
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]" onInteractOutside={(e) => { if (saving) e.preventDefault() }}>
              <DialogHeader>
                <DialogTitle>{editing ? 'Редактировать алиас' : 'Новый алиас'}</DialogTitle>
                <DialogDescription>
                  Укажите исходное значение из данных и нормализованное имя для отображения/сопоставления
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="source" className="text-right">
                    Исходное значение
                  </Label>
                  <Input
                    id="source"
                    value={form.source_value}
                    onChange={(e) => setForm((f) => ({ ...f, source_value: e.target.value }))}
                    className="col-span-3"
                    placeholder={activeTab === 'departments' ? 'Напр. Dep. Sales' : 'Напр. SRL ELECTRO'}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="normalized" className="text-right">
                    Нормализованное имя
                  </Label>
                  <Input
                    id="normalized"
                    value={form.normalized_value}
                    onChange={(e) => setForm((f) => ({ ...f, normalized_value: e.target.value }))}
                    className="col-span-3"
                    placeholder={activeTab === 'departments' ? 'Напр. Продажи' : 'Напр. Electro SRL'}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_group" className="text-right">
                    Это группа?
                  </Label>
                  <div className="col-span-3">
                    <Switch
                      id="is_group"
                      checked={!!form.is_group}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, is_group: !!checked }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {editing ? 'Сохранить' : 'Создать'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" /> Алиасы
          </CardTitle>
          <CardDescription>
            Создавайте соответствия для унификации наименований из внешних источников
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="departments">Департаменты</TabsTrigger>
                <TabsTrigger value="suppliers">Поставщики</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по значениям..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Фильтр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="groups">Только группы</SelectItem>
                    <SelectItem value="items">Только элементы</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value="departments" className="space-y-4">
              <AliasTable
                data={filteredDepartments}
                selectedIds={selectedIds}
                onToggleOne={toggleOne}
                onToggleAll={toggleAll}
                onEdit={openEdit}
                onRemove={remove}
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Показано {filteredDepartments.length} из {departments.length} записей
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">1 из 1</span>
                  <Button variant="outline" size="sm" disabled>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="suppliers" className="space-y-4">
              <AliasTable
                data={filteredSuppliers}
                selectedIds={selectedIds}
                onToggleOne={toggleOne}
                onToggleAll={toggleAll}
                onEdit={openEdit}
                onRemove={remove}
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Показано {filteredSuppliers.length} из {suppliers.length} записей
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">1 из 1</span>
                  <Button variant="outline" size="sm" disabled>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  )
}