// Test data fixtures for API testing

export const testAliases = [
  {
    source_value: 'Test Department 1',
    normalized_value: 'test-dept-1',
    type: 'department',
    is_group: false
  },
  {
    source_value: 'Test Supplier 1',
    normalized_value: 'test-supplier-1',
    type: 'supplier',
    is_group: false
  },
  {
    source_value: 'Test Group Supplier',
    normalized_value: 'test-group-supplier',
    type: 'supplier',
    is_group: true
  }
];

export const testExpenses = [
  {
    source: 'Test Source 1',
    date: '2024-01-15',
    amount: 1500.50,
    currency: 'MDL',
    department: 'Test Department 1',
    supplier: 'Test Supplier 1',
    category: 'Office Supplies',
    description: 'Test expense for API debugging'
  },
  {
    source: 'Test Source 2',
    date: '2024-01-16',
    amount: 2500.00,
    currency: 'MDL',
    department: 'Test Department 1',
    supplier: 'Test Supplier 2',
    category: 'Equipment',
    description: 'Another test expense'
  }
];

export const invalidTestData = {
  aliases: [
    {
      // Missing required fields
      source_value: '',
      normalized_value: '',
      type: 'invalid_type'
    }
  ],
  expenses: [
    {
      // Missing required fields
      date: 'invalid-date',
      amount: 'not-a-number',
      currency: 'INVALID'
    }
  ]
};