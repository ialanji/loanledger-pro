# daisyUI Usage Examples

This document provides practical examples of using daisyUI components in the NANU Financial System.

## Financial Dashboard Components

### Statistics Cards
```tsx
// Financial stats using daisyUI
function FinancialStats() {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow">
      <div className="stat">
        <div className="stat-title">Total Credits</div>
        <div className="stat-value text-primary">1,234</div>
        <div className="stat-desc">↗︎ 400 (22%) this month</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">Active Loans</div>
        <div className="stat-value text-secondary">567</div>
        <div className="stat-desc">↗︎ 90 (18%) this month</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">Total Amount</div>
        <div className="stat-value">1.2M MDL</div>
        <div className="stat-desc">↘︎ 90 (14%) this month</div>
      </div>
    </div>
  );
}
```

### Payment Status Alerts
```tsx
// Payment status notifications
function PaymentAlerts() {
  return (
    <div className="space-y-4">
      <div className="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Payment of 15,000 MDL processed successfully</span>
      </div>
      
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>Payment due in 3 days - Credit #1234</span>
      </div>
      
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Overdue payment - Credit #5678 (7 days late)</span>
      </div>
    </div>
  );
}
```

## Form Components

### Credit Application Form
```tsx
// Credit application using daisyUI forms
function CreditApplicationForm() {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">New Credit Application</h2>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Client Name</span>
          </label>
          <input type="text" placeholder="Enter client name" className="input input-bordered w-full" />
        </div>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Credit Amount (MDL)</span>
          </label>
          <input type="number" placeholder="0.00" className="input input-bordered w-full" />
        </div>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Credit Type</span>
          </label>
          <select className="select select-bordered w-full">
            <option disabled selected>Select credit type</option>
            <option>Investment Credit</option>
            <option>Working Capital</option>
            <option>Personal Loan</option>
          </select>
        </div>
        
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Floating Interest Rate</span>
            <input type="checkbox" className="checkbox checkbox-primary" />
          </label>
        </div>
        
        <div className="card-actions justify-end">
          <button className="btn btn-outline">Cancel</button>
          <button className="btn btn-primary">Submit Application</button>
        </div>
      </div>
    </div>
  );
}
```

### Quick Payment Form
```tsx
// Quick payment form
function QuickPaymentForm() {
  return (
    <div className="card w-96 bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Quick Payment</h2>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Credit ID</span>
          </label>
          <input type="text" placeholder="Enter credit ID" className="input input-bordered w-full" />
        </div>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Payment Amount</span>
          </label>
          <div className="input-group">
            <input type="number" placeholder="0.00" className="input input-bordered w-full" />
            <span className="bg-base-200 px-4 flex items-center">MDL</span>
          </div>
        </div>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Payment Date</span>
          </label>
          <input type="date" className="input input-bordered w-full" />
        </div>
        
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Process Payment</button>
        </div>
      </div>
    </div>
  );
}
```

## Data Display Components

### Credit Status Cards
```tsx
// Credit status display
function CreditStatusCard({ credit }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <div className="badge badge-success">Active</div>;
      case 'closed':
        return <div className="badge badge-neutral">Closed</div>;
      case 'overdue':
        return <div className="badge badge-error">Overdue</div>;
      default:
        return <div className="badge">Unknown</div>;
    }
  };

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title">Credit #{credit.id}</h2>
          {getStatusBadge(credit.status)}
        </div>
        
        <div className="stats stats-vertical">
          <div className="stat px-0">
            <div className="stat-title">Amount</div>
            <div className="stat-value text-lg">{credit.amount} MDL</div>
          </div>
          
          <div className="stat px-0">
            <div className="stat-title">Interest Rate</div>
            <div className="stat-value text-lg">{credit.interestRate}%</div>
          </div>
          
          <div className="stat px-0">
            <div className="stat-title">Next Payment</div>
            <div className="stat-value text-lg">{credit.nextPayment} MDL</div>
            <div className="stat-desc">{credit.nextPaymentDate}</div>
          </div>
        </div>
        
        <div className="card-actions justify-end">
          <button className="btn btn-sm btn-outline">View Details</button>
          <button className="btn btn-sm btn-primary">Make Payment</button>
        </div>
      </div>
    </div>
  );
}
```

### Bank Information Display
```tsx
// Bank information cards
function BankCard({ bank }) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-neutral-focus text-neutral-content rounded-full w-12">
              <span className="text-xl">{bank.name.charAt(0)}</span>
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="card-title">{bank.name}</h2>
            <p className="text-base-content/70">{bank.code}</p>
          </div>
          
          <div className="badge badge-primary">{bank.activeCredits} Credits</div>
        </div>
        
        <div className="divider"></div>
        
        <div className="stats stats-horizontal">
          <div className="stat">
            <div className="stat-title">Total Amount</div>
            <div className="stat-value text-primary">{bank.totalAmount}</div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Avg. Rate</div>
            <div className="stat-value text-secondary">{bank.avgRate}%</div>
          </div>
        </div>
        
        <div className="card-actions justify-end">
          <button className="btn btn-sm btn-ghost">View Credits</button>
          <button className="btn btn-sm btn-primary">New Credit</button>
        </div>
      </div>
    </div>
  );
}
```

## Navigation Components

### Financial Menu
```tsx
// Financial system navigation
function FinancialNavigation() {
  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path>
            </svg>
          </label>
          <ul tabIndex={0} className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52">
            <li><a>Credits</a></li>
            <li><a>Payments</a></li>
            <li><a>Banks</a></li>
            <li><a>Reports</a></li>
          </ul>
        </div>
        <a className="btn btn-ghost normal-case text-xl">NANU Financial</a>
      </div>
      
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a>Credits</a></li>
          <li><a>Payments</a></li>
          <li><a>Banks</a></li>
          <li><a>Reports</a></li>
        </ul>
      </div>
      
      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full">
              <img src="/avatar.jpg" alt="User" />
            </div>
          </label>
          <ul tabIndex={0} className="mt-3 p-2 shadow menu menu-compact dropdown-content bg-base-100 rounded-box w-52">
            <li><a>Profile</a></li>
            <li><a>Settings</a></li>
            <li><a>Logout</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

## Mixed Component Examples

### Dashboard with Both Libraries
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function MixedDashboard() {
  return (
    <div className="space-y-6">
      {/* shadcn/ui Card with daisyUI stats */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stats stats-vertical lg:stats-horizontal shadow">
            <div className="stat">
              <div className="stat-title">Total Credits</div>
              <div className="stat-value text-primary">1,234</div>
            </div>
            <div className="stat">
              <div className="stat-title">Active Amount</div>
              <div className="stat-value text-secondary">2.4M MDL</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* daisyUI card with shadcn/ui buttons */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Quick Actions</h2>
          <p>Perform common financial operations</p>
          <div className="card-actions justify-end">
            <Button variant="outline">View Reports</Button>
            <Button>New Credit</Button>
          </div>
        </div>
      </div>
      
      {/* Mixed alert system */}
      <div className="space-y-4">
        <div className="alert alert-info">
          <span>System maintenance scheduled for tonight at 2 AM</span>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="alert alert-warning">
              <span>5 credits require attention - payments overdue</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Responsive Examples

### Mobile-First Financial Cards
```tsx
function ResponsiveFinancialGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {credits.map(credit => (
        <div key={credit.id} className="card bg-base-100 shadow-md">
          <div className="card-body p-4 md:p-6">
            <h2 className="card-title text-sm md:text-base">
              Credit #{credit.id}
              <div className="badge badge-sm md:badge-md badge-primary">
                {credit.status}
              </div>
            </h2>
            
            <div className="stats stats-vertical">
              <div className="stat px-0 py-2">
                <div className="stat-title text-xs">Amount</div>
                <div className="stat-value text-sm md:text-lg">
                  {credit.amount} MDL
                </div>
              </div>
            </div>
            
            <div className="card-actions justify-end">
              <button className="btn btn-xs md:btn-sm btn-primary">
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Theme-Aware Components

### Dynamic Theme Components
```tsx
import { useTheme } from '@/components/theme-provider';

function ThemeAwareFinancialCard() {
  const { theme } = useTheme();
  
  return (
    <div className={`card shadow-xl ${
      theme === 'dark' ? 'bg-base-100' : 'bg-white'
    }`}>
      <div className="card-body">
        <h2 className="card-title">
          Financial Summary
          <div className={`badge ${
            theme === 'dark' ? 'badge-primary' : 'badge-neutral'
          }`}>
            Live
          </div>
        </h2>
        
        <div className="stats bg-transparent">
          <div className="stat">
            <div className="stat-value text-primary">2.4M</div>
            <div className="stat-title">Total Portfolio</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```