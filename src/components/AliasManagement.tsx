import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit2, Save, X, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface Alias {
  id: string;
  alias: string;
  canonical_name: string;
  type: 'department' | 'supplier';
  created_at: string;
  is_group?: boolean;
}

interface AliasFormData {
  alias: string;
  canonical_name: string;
  type: 'department' | 'supplier';
  is_group: boolean;
}

export function AliasManagement() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AliasFormData>({ alias: '', canonical_name: '', type: 'department', is_group: false });
  const [newAlias, setNewAlias] = useState<AliasFormData>({ alias: '', canonical_name: '', type: 'department', is_group: false });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'item'>('all');

  // Load aliases on component mount
  useEffect(() => {
    loadAliases();
  }, []);

  const mapToAlias = (row: any): Alias => {
    const aliasVal = row.alias ?? row.raw ?? '';
    const canonicalVal = row.canonical_name ?? row.canonical ?? '';
    return {
      id: String(row.id),
      alias: aliasVal,
      canonical_name: canonicalVal,
      type: (row.type as 'department' | 'supplier') ?? 'department',
      created_at: row.created_at ?? new Date().toISOString(),
      is_group: typeof row.is_group === 'boolean' ? row.is_group : aliasVal === canonicalVal,
    };
  };

  const loadAliases = async () => {
    try {
      const data = await apiClient.get('/aliases');
      const mapped = Array.isArray(data) ? data.map(mapToAlias) : [];
      setAliases(mapped || []);
    } catch (error) {
      console.error('Error loading aliases:', error);
      // Fallback: загрузка из отдельных эндпоинтов
      try {
        const dept = await apiClient.get('/dept-aliases?limit=10000');
        const sup = await apiClient.get('/supplier-aliases?limit=10000');
        const mapRow = (row: any, type: 'department' | 'supplier') => {
          const aliasVal = row.raw ?? '';
          const canonicalVal = row.canonical ?? '';
          return {
            id: String(row.id),
            alias: aliasVal,
            canonical_name: canonicalVal,
            type,
            created_at: new Date().toISOString(),
            is_group: aliasVal === canonicalVal,
          } as Alias;
        };
        const combined = [
          ...((dept || []) as any[]).map((r) => mapRow(r, 'department')),
          ...((sup || []) as any[]).map((r) => mapRow(r, 'supplier')),
        ];
        setAliases(combined);
        // toast.success('Загружено из резервных эндпоинтов');
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
        toast.error('Failed to load aliases');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlias = async () => {
    if (!newAlias.alias.trim() || !newAlias.canonical_name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const data = await apiClient.post('/aliases', newAlias);
      const mapped = mapToAlias(data ?? newAlias);
      setAliases(prev => [...prev, mapped]);
      setNewAlias({ alias: '', canonical_name: '', type: 'department', is_group: false });
      setShowAddDialog(false);
      toast.success('Alias added successfully');
    } catch (error) {
      console.error('Error adding alias:', error);
      toast.error('Failed to add alias');
    }
  };

  const handleEditAlias = (alias: Alias) => {
    setEditingId(alias.id);
    setEditForm({
      alias: alias.alias,
      canonical_name: alias.canonical_name,
      type: alias.type,
      is_group: !!alias.is_group,
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.alias.trim() || !editForm.canonical_name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const data = await apiClient.put(`/aliases/${editingId}`, editForm);
      const mapped = mapToAlias(data ?? { ...editForm, id: editingId });
      setAliases(prev => prev.map(alias => 
        alias.id === editingId ? mapped : alias
      ));
      setEditingId(null);
      toast.success('Alias updated successfully');
    } catch (error) {
      console.error('Error updating alias:', error);
      toast.error('Failed to update alias');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ alias: '', canonical_name: '', type: 'department', is_group: false });
  };

  const handleDeleteAlias = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alias?')) return;

    try {
      await apiClient.delete(`/aliases/${id}`);
      setAliases(prev => prev.filter(alias => alias.id !== id));
      toast.success('Alias deleted successfully');
    } catch (error) {
      console.error('Error deleting alias:', error);
      toast.error('Failed to delete alias');
    }
  };

  const departmentAliases = aliases.filter(alias => alias.type === 'department');
  const supplierAliases = aliases.filter(alias => alias.type === 'supplier');

  const applyFilters = (list: Alias[]) => {
    const q = search.trim().toLowerCase();
    let result = list;
    if (q) {
      result = result.filter(a =>
        a.alias.toLowerCase().includes(q) ||
        a.canonical_name.toLowerCase().includes(q)
      );
    }
    result = result.filter(x => {
      if (filterType === 'all') return true;
      if (filterType === 'group') return !!x.is_group;
      if (filterType === 'item') return !x.is_group;
      return true;
    });
    return result;
  };

  const filteredDepartmentAliases = applyFilters(departmentAliases);
  const filteredSupplierAliases = applyFilters(supplierAliases);

  const exportToCSV = (type: 'department' | 'supplier') => {
    const data = type === 'department' ? departmentAliases : supplierAliases;
    const headers = ['ID', 'Алиас', 'Каноническое имя', 'is_group'];

    const csvContent = [
      headers.join(';'),
      ...data.map(item => [
        item.id,
        `"${item.alias.replace(/"/g, '""')}"`,
        `"${item.canonical_name.replace(/"/g, '""')}"`,
        item.is_group ? 'TRUE' : 'FALSE',
      ].join(';'))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `aliases_${type === 'department' ? 'departments' : 'suppliers'}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderAliasRow = (alias: Alias) => {
    const isEditing = editingId === alias.id;

    return (
      <div key={alias.id} className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex-1 grid grid-cols-2 gap-4">
          {isEditing ? (
            <>
              <div>
                <Label htmlFor={`alias-${alias.id}`}>Alias</Label>
                <Input
                  id={`alias-${alias.id}`}
                  value={editForm.alias}
                  onChange={(e) => setEditForm(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="Enter alias"
                />
              </div>
              <div>
                <Label htmlFor={`canonical-${alias.id}`}>Canonical Name</Label>
                <Input
                  id={`canonical-${alias.id}`}
                  value={editForm.canonical_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, canonical_name: e.target.value }))}
                  placeholder="Enter canonical name"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Label htmlFor={`is-group-${alias.id}`}>Это группа?</Label>
                  <Switch
                    id={`is-group-${alias.id}`}
                    checked={!!editForm.is_group}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_group: !!checked }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="font-medium">{alias.alias}</div>
                <div className="text-sm text-muted-foreground">Alias</div>
              </div>
              <div>
                <div className={alias.is_group ? 'font-bold text-blue-600' : 'font-medium'}>{alias.canonical_name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>Canonical Name</span>
                  {alias.is_group && <Badge variant="secondary">Группа</Badge>}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSaveEdit}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => handleEditAlias(alias)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteAlias(alias.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading aliases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alias Management</h2>
          <p className="text-muted-foreground">
            Manage aliases for departments and suppliers to standardize data during import
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Alias
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Alias</DialogTitle>
              <DialogDescription>
                Create a new alias to map variations to a canonical name
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-type">Type</Label>
                <Select
                  value={newAlias.type}
                  onValueChange={(value: 'department' | 'supplier') => 
                    setNewAlias(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-alias">Alias</Label>
                <Input
                  id="new-alias"
                  value={newAlias.alias}
                  onChange={(e) => setNewAlias(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="Enter alias (e.g., 'IT Dept')"
                />
              </div>
              <div>
                <Label htmlFor="new-canonical">Canonical Name</Label>
                <Input
                  id="new-canonical"
                  value={newAlias.canonical_name}
                  onChange={(e) => setNewAlias(prev => ({ ...prev, canonical_name: e.target.value }))}
                  placeholder="Enter canonical name (e.g., 'Information Technology')"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Label htmlFor="is-group">Это группа?</Label>
                <Switch
                  id="is-group"
                  checked={!!newAlias.is_group}
                  onCheckedChange={(checked) => setNewAlias(prev => ({ ...prev, is_group: !!checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAlias}>Add Alias</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments">
            Departments
            <Badge variant="secondary" className="ml-2">
              {departmentAliases.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            Suppliers
            <Badge variant="secondary" className="ml-2">
              {supplierAliases.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Department Aliases</CardTitle>
              <CardDescription>
                Map department name variations to standardized canonical names
              </CardDescription>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Input
                  placeholder="Поиск по алиасам..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Select value={filterType} onValueChange={(v: 'all'|'group'|'item') => setFilterType(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="group">Группы</SelectItem>
                    <SelectItem value="item">Подразделения</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportToCSV('department')}>
                  <Download className="mr-2 h-4 w-4" /> Экспорт CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredDepartmentAliases.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Нет данных</div>
                ) : (
                  filteredDepartmentAliases.map(renderAliasRow)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Aliases</CardTitle>
              <CardDescription>
                Map supplier name variations to standardized canonical names
              </CardDescription>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Input
                  placeholder="Поиск по алиасам..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Select value={filterType} onValueChange={(v: 'all'|'group'|'item') => setFilterType(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="group">Группы</SelectItem>
                    <SelectItem value="item">Подрядчики</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportToCSV('supplier')}>
                  <Download className="mr-2 h-4 w-4" /> Экспорт CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSupplierAliases.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Нет данных</div>
                ) : (
                  filteredSupplierAliases.map(renderAliasRow)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}