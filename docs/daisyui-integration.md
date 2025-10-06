# daisyUI Integration Guide

This document provides comprehensive guidance on using daisyUI components alongside the existing shadcn/ui component library in the NANU Financial System.

## Overview

The project now supports both **shadcn/ui** and **daisyUI** component libraries, allowing developers to:
- Use shadcn/ui for complex, customizable components
- Use daisyUI for rapid prototyping and utility components
- Maintain consistent theming across both libraries
- Switch between light and dark modes seamlessly

## Installation and Configuration

### Dependencies
- `daisyui`: ^5.1.27
- `tailwindcss`: ^3.4.17
- `postcss`: ^8.5.6

### Tailwind Configuration
The integration is configured in `tailwind.config.ts`:

```typescript
export default {
  // ... existing config
  plugins: [require("tailwindcss-animate"), require("daisyui")],
  daisyui: {
    base: false, // Prevents conflicts with shadcn/ui
    themes: ["light", "dark"], // Matches existing theme system
    darkTheme: "dark",
    styled: true,
    utils: true,
    logs: false,
  },
} satisfies Config;
```

### Theme System
The project uses a custom theme provider (`src/components/theme-provider.tsx`) that supports:
- **Light mode**: Default light theme
- **Dark mode**: Dark theme with proper contrast
- **System mode**: Follows OS preference

## Usage Patterns

### When to Use Each Library

#### Use shadcn/ui for:
- ✅ Form components (inputs, selects, checkboxes)
- ✅ Complex UI patterns (dialogs, dropdowns, tooltips)
- ✅ Data display (tables, cards with complex layouts)
- ✅ Navigation components
- ✅ Components requiring extensive customization

#### Use daisyUI for:
- ✅ Quick prototyping
- ✅ Simple utility components (buttons, badges, alerts)
- ✅ Layout components (stats, hero sections)
- ✅ Components with built-in variants
- ✅ Rapid development scenarios

### Component Examples

#### Buttons

**shadcn/ui Button:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
```

**daisyUI Button:**
```tsx
<button className="btn btn-primary">Primary Action</button>
<button className="btn btn-secondary">Secondary Action</button>
<button className="btn btn-outline">Outline Button</button>
<button className="btn btn-ghost">Ghost Button</button>
```

#### Cards

**shadcn/ui Card:**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

**daisyUI Card:**
```tsx
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card content goes here</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

#### Alerts and Notifications

**daisyUI Alerts (Recommended):**
```tsx
<div className="alert alert-info">
  <span>Information message</span>
</div>

<div className="alert alert-success">
  <span>Success message</span>
</div>

<div className="alert alert-warning">
  <span>Warning message</span>
</div>

<div className="alert alert-error">
  <span>Error message</span>
</div>
```

#### Form Components

**shadcn/ui Forms (Recommended):**
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter your email" />
</div>
```

**daisyUI Forms:**
```tsx
<div className="form-control w-full">
  <label className="label">
    <span className="label-text">Email</span>
  </label>
  <input type="email" placeholder="Enter your email" className="input input-bordered w-full" />
</div>
```

## Theme Integration

### CSS Variables
Both libraries use the same CSS variables defined in `src/index.css`:

```css
:root {
  --primary: 217 91% 60%;
  --secondary: 220 14% 96%;
  --accent: 142 76% 36%;
  --background: 248 50% 98%;
  --foreground: 225 71% 6%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

### Theme Toggle
Use the `ThemeToggle` component in your layout:

```tsx
import { ThemeToggle } from '@/components/theme-toggle';

<ThemeToggle />
```

### Using Theme in Components
```tsx
import { useTheme } from '@/components/theme-provider';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Switch to Dark</button>
    </div>
  );
}
```

## Best Practices

### 1. Component Selection
- **Prefer shadcn/ui** for production components requiring customization
- **Use daisyUI** for prototyping and simple utility components
- **Don't mix** component classes on the same element

### 2. Styling Consistency
```tsx
// ✅ Good: Use one library per component
<Button>shadcn/ui button</Button>
<button className="btn btn-primary">daisyUI button</button>

// ❌ Bad: Don't mix classes
<Button className="btn btn-primary">Mixed classes</Button>
```

### 3. Theme Compatibility
- Always use CSS variables for custom colors
- Test components in both light and dark modes
- Use the theme toggle to verify appearance

### 4. Performance Considerations
- daisyUI adds ~63KB to the CSS bundle (gzipped: ~10KB)
- Use tree-shaking by only importing needed components
- Consider code splitting for large applications

## Common Patterns

### Mixed Component Layouts
```tsx
// shadcn/ui card with daisyUI content
<Card>
  <CardHeader>
    <CardTitle>Statistics</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="stats shadow">
      <div className="stat">
        <div className="stat-title">Total Users</div>
        <div className="stat-value">31K</div>
      </div>
    </div>
  </CardContent>
</Card>
```

### Responsive Design
```tsx
// Both libraries support responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>shadcn/ui card</Card>
  <div className="card bg-base-100 shadow-xl">
    <div className="card-body">daisyUI card</div>
  </div>
</div>
```

### Form Validation
```tsx
// Combine shadcn/ui forms with daisyUI alerts
<form className="space-y-4">
  <Input type="email" placeholder="Email" />
  
  {error && (
    <div className="alert alert-error">
      <span>{error}</span>
    </div>
  )}
  
  <Button type="submit">Submit</Button>
</form>
```

## Testing

### Visual Testing
Visit `/daisyui-test` to see comprehensive examples of:
- Component compatibility
- Theme switching
- Responsive behavior
- Conflict resolution

### Component Testing
```tsx
// Test both libraries in your components
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';

function renderWithTheme(component: React.ReactElement) {
  return render(
    <ThemeProvider defaultTheme="light">
      {component}
    </ThemeProvider>
  );
}
```

## Troubleshooting

### Common Issues

1. **Styling Conflicts**
   - Don't mix component classes
   - Use CSS overrides in `src/styles/daisyui-overrides.css`

2. **Theme Not Applying**
   - Ensure `ThemeProvider` wraps your app
   - Check CSS variable definitions

3. **Build Issues**
   - Verify Tailwind configuration
   - Check for CSS import order

### Getting Help
- Check the test page at `/daisyui-test`
- Review conflict resolution guidelines
- Consult the component documentation

## Migration Guide

### From Pure shadcn/ui
1. Install daisyUI: `npm install daisyui`
2. Update `tailwind.config.ts` with daisyUI plugin
3. Add theme provider to your app
4. Start using daisyUI components gradually

### Adding New Components
1. Choose the appropriate library based on use case
2. Follow the established patterns
3. Test in both light and dark modes
4. Document any custom overrides needed

## Resources

- [daisyUI Documentation](https://daisyui.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- Project test page: `/daisyui-test`