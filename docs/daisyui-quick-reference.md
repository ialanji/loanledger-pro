# daisyUI Quick Reference

## Component Cheat Sheet

### Buttons
```tsx
// Basic buttons
<button className="btn">Default</button>
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-accent">Accent</button>

// Button variants
<button className="btn btn-outline">Outline</button>
<button className="btn btn-ghost">Ghost</button>
<button className="btn btn-link">Link</button>

// Button sizes
<button className="btn btn-xs">Extra Small</button>
<button className="btn btn-sm">Small</button>
<button className="btn btn-md">Medium</button>
<button className="btn btn-lg">Large</button>

// Button states
<button className="btn btn-disabled">Disabled</button>
<button className="btn loading">Loading</button>
```

### Cards
```tsx
// Basic card
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card content</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>

// Card with image
<div className="card bg-base-100 shadow-xl">
  <figure><img src="image.jpg" alt="Description" /></figure>
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card content</p>
  </div>
</div>
```

### Alerts
```tsx
<div className="alert">Default alert</div>
<div className="alert alert-info">Info alert</div>
<div className="alert alert-success">Success alert</div>
<div className="alert alert-warning">Warning alert</div>
<div className="alert alert-error">Error alert</div>
```

### Forms
```tsx
// Input
<input type="text" placeholder="Type here" className="input input-bordered w-full" />

// Textarea
<textarea className="textarea textarea-bordered" placeholder="Bio"></textarea>

// Select
<select className="select select-bordered w-full">
  <option disabled selected>Pick one</option>
  <option>Option 1</option>
  <option>Option 2</option>
</select>

// Checkbox
<input type="checkbox" className="checkbox" />

// Radio
<input type="radio" name="radio-1" className="radio" />

// Form control wrapper
<div className="form-control w-full">
  <label className="label">
    <span className="label-text">Label</span>
  </label>
  <input type="text" className="input input-bordered w-full" />
</div>
```

### Badges
```tsx
<div className="badge">Default</div>
<div className="badge badge-primary">Primary</div>
<div className="badge badge-secondary">Secondary</div>
<div className="badge badge-accent">Accent</div>
<div className="badge badge-outline">Outline</div>
```

### Stats
```tsx
<div className="stats shadow">
  <div className="stat">
    <div className="stat-title">Total Page Views</div>
    <div className="stat-value">89,400</div>
    <div className="stat-desc">21% more than last month</div>
  </div>
</div>
```

### Loading
```tsx
<span className="loading loading-spinner loading-xs"></span>
<span className="loading loading-spinner loading-sm"></span>
<span className="loading loading-spinner loading-md"></span>
<span className="loading loading-spinner loading-lg"></span>
```

## Color Classes

### Background Colors
- `bg-primary` - Primary color
- `bg-secondary` - Secondary color  
- `bg-accent` - Accent color
- `bg-base-100` - Base background
- `bg-base-200` - Slightly darker base
- `bg-base-300` - Even darker base

### Text Colors
- `text-primary` - Primary text
- `text-secondary` - Secondary text
- `text-accent` - Accent text
- `text-base-content` - Base content text

## Responsive Classes

All daisyUI classes work with Tailwind's responsive prefixes:
```tsx
<button className="btn btn-sm md:btn-md lg:btn-lg">
  Responsive button
</button>

<div className="card w-full md:w-1/2 lg:w-1/3">
  Responsive card
</div>
```

## Theme Integration

### Using with CSS Variables
```tsx
// These automatically adapt to light/dark mode
<div className="bg-base-100 text-base-content">
  Content that adapts to theme
</div>
```

### Custom Colors
```tsx
// Use Tailwind's color system
<button className="btn" style={{backgroundColor: 'hsl(var(--primary))'}}>
  Custom themed button
</button>
```

## Common Patterns

### Modal
```tsx
<div className="modal modal-open">
  <div className="modal-box">
    <h3 className="font-bold text-lg">Modal Title</h3>
    <p className="py-4">Modal content</p>
    <div className="modal-action">
      <button className="btn">Close</button>
    </div>
  </div>
</div>
```

### Navigation
```tsx
<div className="navbar bg-base-100">
  <div className="navbar-start">
    <a className="btn btn-ghost normal-case text-xl">Brand</a>
  </div>
  <div className="navbar-end">
    <button className="btn btn-square btn-ghost">
      <svg>...</svg>
    </button>
  </div>
</div>
```

### Hero Section
```tsx
<div className="hero min-h-screen bg-base-200">
  <div className="hero-content text-center">
    <div className="max-w-md">
      <h1 className="text-5xl font-bold">Hello there</h1>
      <p className="py-6">Description text</p>
      <button className="btn btn-primary">Get Started</button>
    </div>
  </div>
</div>
```

## Integration Tips

### With shadcn/ui
```tsx
// Use shadcn/ui Card with daisyUI content
<Card>
  <CardContent>
    <div className="stats shadow">
      <div className="stat">
        <div className="stat-value">31K</div>
      </div>
    </div>
  </CardContent>
</Card>

// Use daisyUI card with shadcn/ui buttons
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <Button>shadcn/ui button in daisyUI card</Button>
  </div>
</div>
```

### Theme Switching
```tsx
import { useTheme } from '@/components/theme-provider';

function ThemeAwareComponent() {
  const { theme } = useTheme();
  
  return (
    <div className={`card ${theme === 'dark' ? 'bg-base-100' : 'bg-white'}`}>
      Content adapts to theme
    </div>
  );
}
```