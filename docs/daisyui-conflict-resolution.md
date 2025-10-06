# daisyUI Conflict Resolution Guide

This guide provides comprehensive strategies for resolving styling conflicts between daisyUI and shadcn/ui components in the NANU Financial System.

## Overview

When integrating daisyUI with an existing shadcn/ui project, conflicts can arise due to:
- CSS specificity issues
- Overlapping class names
- Theme variable mismatches
- Component behavior differences
- Build process conflicts
- Runtime styling issues

This guide helps identify, prevent, and resolve these conflicts while maintaining the integrity of both component libraries.

## When to Use daisyUI vs shadcn/ui Components

### Use shadcn/ui for:
- **Form components** (Input, Select, Checkbox, RadioGroup)
  - Better form validation integration
  - More customizable styling
  - Better accessibility features
  - Seamless integration with React Hook Form

- **Complex UI patterns** (Dialog, DropdownMenu, Tooltip, Popover)
  - More sophisticated behavior
  - Better keyboard navigation
  - Advanced positioning options
  - Extensive customization capabilities

- **Data display** (Table, DataTable)
  - Better sorting and filtering
  - More flexible column definitions
  - Better performance with large datasets

- **Navigation** (NavigationMenu, Breadcrumb)
  - More accessible navigation patterns
  - Better SEO support
  - More customizable styling

### Use daisyUI for:
- **Alerts and notifications** (alert, toast)
  - Built-in semantic variants
  - Better visual hierarchy
  - Simpler implementation

- **Statistics and metrics** (stats, progress, radial-progress)
  - Purpose-built for data visualization
  - Better visual impact
  - Less custom CSS required

- **Layout components** (hero, footer, navbar)
  - Pre-designed layout patterns
  - Responsive by default
  - Faster prototyping

- **Simple interactive elements** (button, badge, chip)
  - When you need quick implementation
  - For prototyping and testing
  - When shadcn/ui alternatives are too complex

### Decision Matrix

| Component Type | Recommended Library | Reason |
|----------------|-------------------|---------|
| Forms | shadcn/ui | Better validation, accessibility |
| Buttons (primary actions) | shadcn/ui | Consistent with form styling |
| Buttons (secondary actions) | daisyUI | Faster implementation |
| Cards (complex) | shadcn/ui | More customization options |
| Cards (simple) | daisyUI | Built-in variants |
| Alerts | daisyUI | Better semantic variants |
| Tables | shadcn/ui | Better data handling |
| Stats/Metrics | daisyUI | Purpose-built components |
| Modals/Dialogs | shadcn/ui | Better accessibility |
| Loading states | daisyUI | Built-in animations |

## Common Conflict Types

### 1. CSS Specificity Conflicts

**Problem**: daisyUI styles override shadcn/ui styles or vice versa.

**Example**:
```tsx
// This might cause conflicts
<Button className="btn btn-primary">Mixed classes</Button>
```

**Solution**:
```tsx
// Use components separately
<Button>shadcn/ui button</Button>
<button className="btn btn-primary">daisyUI button</button>
```

### 2. Theme Variable Mismatches

**Problem**: Components don't adapt properly to theme changes.

**Symptoms**:
- Colors don't change with theme toggle
- Inconsistent appearance between libraries
- Hard-coded colors breaking theme system

**Solution**: Use CSS overrides in `src/styles/daisyui-overrides.css`:

```css
/* Fix daisyUI components to use theme variables */
.card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
}

.alert-info {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 0.2);
}
```

### 3. Focus State Conflicts

**Problem**: Focus indicators don't match design system.

**Solution**:
```css
/* Standardize focus states */
.btn:focus-visible,
.input:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### 4. Form Validation Conflicts

**Problem**: Error states look different between libraries.

**Solution**:
```css
/* Align error states */
.input-error {
  border-color: hsl(var(--destructive));
}

.input-error:focus {
  outline-color: hsl(var(--destructive));
  border-color: hsl(var(--destructive));
}
```

## Conflict Detection

### Visual Inspection Checklist

1. **Theme Switching Test**
   - Toggle between light and dark modes
   - Verify all components adapt correctly
   - Check for hard-coded colors

2. **Component Interaction Test**
   - Test focus states on all interactive elements
   - Verify hover effects work consistently
   - Check keyboard navigation

3. **Mixed Usage Test**
   - Place shadcn/ui and daisyUI components side by side
   - Test components within each other's containers
   - Verify spacing and alignment

4. **Responsive Behavior Test**
   - Test on different screen sizes
   - Verify breakpoint behavior
   - Check mobile usability

### Automated Detection

Use the conflict test component at `/daisyui-test` to identify issues:

```tsx
// Access the test page
// Navigate to /daisyui-test in your browser
// Review the "Conflict Detection and Resolution" section
```

## Resolution Strategies

### Strategy 1: Component Separation (Recommended)

**Principle**: Use one library per component type.

```tsx
// ✅ Good: Clear separation
function GoodExample() {
  return (
    <div>
      {/* Use shadcn/ui for complex forms */}
      <Card>
        <CardContent>
          <Input placeholder="shadcn/ui input" />
          <Button>Submit</Button>
        </CardContent>
      </Card>
      
      {/* Use daisyUI for alerts and stats */}
      <div className="alert alert-success">
        <span>Operation successful</span>
      </div>
      
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-value">100%</div>
        </div>
      </div>
    </div>
  );
}
```

### Strategy 2: CSS Override System

**When to use**: When you need specific styling adjustments.

**Implementation**:
1. Add overrides to `src/styles/daisyui-overrides.css`
2. Use CSS layers for proper specificity
3. Target specific components

```css
@layer components {
  /* Override specific daisyUI components */
  .btn-custom {
    @apply bg-primary text-primary-foreground;
    border-radius: var(--radius);
  }
  
  .card-custom {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
  }
}
```

### Strategy 3: Wrapper Components

**When to use**: When you need consistent behavior across the app.

```tsx
// Create wrapper components for consistency
function ThemedAlert({ type, children }) {
  const alertClasses = {
    info: 'alert alert-info',
    success: 'alert alert-success',
    warning: 'alert alert-warning',
    error: 'alert alert-error'
  };
  
  return (
    <div className={alertClasses[type]}>
      <span>{children}</span>
    </div>
  );
}

// Usage
<ThemedAlert type="success">Operation completed</ThemedAlert>
```

### Strategy 4: Conditional Styling

**When to use**: For theme-dependent styling.

```tsx
import { useTheme } from '@/components/theme-provider';

function ConditionalComponent() {
  const { theme } = useTheme();
  
  return (
    <div className={`card ${
      theme === 'dark' 
        ? 'bg-base-100 border-base-300' 
        : 'bg-white border-gray-200'
    }`}>
      Content adapts to theme
    </div>
  );
}
```

## Specific Conflict Resolutions

### Button Conflicts

**Problem**: Mixed button classes causing styling issues.

```tsx
// ❌ Problematic
<Button className="btn btn-primary">Conflicted button</Button>

// ✅ Solutions
// Option 1: Use shadcn/ui only
<Button className="bg-primary text-primary-foreground">Themed button</Button>

// Option 2: Use daisyUI only
<button className="btn btn-primary">daisyUI button</button>

// Option 3: Custom wrapper
function ThemedButton({ variant, children, ...props }) {
  if (variant === 'daisyui') {
    return <button className="btn btn-primary" {...props}>{children}</button>;
  }
  return <Button {...props}>{children}</Button>;
}
```

### Input Conflicts

**Problem**: Form validation styles not consistent.

```css
/* Add to daisyui-overrides.css */
.input-bordered {
  border-color: hsl(var(--border));
}

.input-bordered:focus {
  border-color: hsl(var(--ring));
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.input-error {
  border-color: hsl(var(--destructive));
}
```

### Card Conflicts

**Problem**: Different card styling between libraries.

```tsx
// Standardized card component
function StandardCard({ title, children, variant = 'shadcn' }) {
  if (variant === 'daisyui') {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {title && <h2 className="card-title">{title}</h2>}
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

### Theme Toggle Conflicts

**Problem**: Theme changes don't apply to all components.

```tsx
// Ensure all components respond to theme changes
function ThemeAwareApp() {
  const { theme } = useTheme();
  
  useEffect(() => {
    // Force re-render of daisyUI components on theme change
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return <App />;
}
```

## Prevention Best Practices

### 1. Establish Component Guidelines

```tsx
// Create a component decision matrix
const COMPONENT_GUIDELINES = {
  // Use shadcn/ui for:
  forms: 'shadcn/ui', // Better form handling
  dialogs: 'shadcn/ui', // More customizable
  dropdowns: 'shadcn/ui', // Better accessibility
  
  // Use daisyUI for:
  alerts: 'daisyui', // Better built-in variants
  stats: 'daisyui', // Purpose-built for data display
  heroes: 'daisyui', // Better layout components
  loading: 'daisyui', // Built-in animations
};
```

### 2. Code Review Checklist

- [ ] No mixed component classes on single elements
- [ ] Theme variables used instead of hard-coded colors
- [ ] Components tested in both light and dark modes
- [ ] Focus states work correctly
- [ ] Responsive behavior verified
- [ ] Accessibility maintained

### 3. Linting Rules

```javascript
// .eslintrc.js - Custom rules to prevent conflicts
module.exports = {
  rules: {
    // Prevent mixing component classes
    'no-mixed-component-classes': 'error',
    // Require theme variables for colors
    'use-theme-variables': 'warn',
  }
};
```

## Troubleshooting Guide for Common Integration Issues

This section provides step-by-step solutions for the most common issues encountered when integrating daisyUI with shadcn/ui components.

### Issue 1: Components don't change with theme

**Symptoms**:
- daisyUI components remain the same color when switching themes
- Some components use light theme colors in dark mode
- Theme toggle doesn't affect all components

**Diagnosis Steps**:
1. Check if ThemeProvider wraps the app
2. Verify CSS variables are defined in `src/index.css`
3. Check for hard-coded colors in component classes
4. Inspect HTML element for theme attributes

**Solution**:
```tsx
// 1. Ensure proper theme provider setup
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>

// 2. Verify theme variables are applied
useEffect(() => {
  const { theme } = useTheme();
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);

// 3. Use theme variables instead of hard-coded colors
// ❌ Wrong
<div className="bg-blue-500 text-white">

// ✅ Correct
<div className="bg-primary text-primary-foreground">
```

### Issue 2: Styling conflicts in production

**Symptoms**:
- Components look different in production vs development
- CSS classes not applying correctly
- Unexpected styling overrides

**Diagnosis Steps**:
1. Check CSS build order in production bundle
2. Verify Tailwind configuration matches between environments
3. Check for CSS specificity issues
4. Inspect production CSS for missing classes

**Solution**:
```css
/* Add to src/styles/daisyui-overrides.css */
/* Use CSS layers to control specificity */
@layer base {
  /* Base theme variables */
}

@layer components {
  /* Component overrides */
  .btn-override {
    @apply bg-primary text-primary-foreground;
  }
}

@layer utilities {
  /* Utility overrides */
  .critical-override {
    background-color: hsl(var(--primary)) !important;
  }
}
```

### Issue 3: Mixed component classes causing conflicts

**Symptoms**:
- Buttons or inputs look broken when using both libraries
- Inconsistent styling across similar components
- Focus states not working properly

**Diagnosis Steps**:
1. Identify components using mixed classes
2. Check for conflicting CSS rules
3. Verify component isolation

**Solution**:
```tsx
// ❌ Problematic: Mixed classes
<Button className="btn btn-primary">Conflicted</Button>

// ✅ Solution 1: Use separate components
<Button variant="default">shadcn/ui button</Button>
<button className="btn btn-primary">daisyUI button</button>

// ✅ Solution 2: Create wrapper component
function UnifiedButton({ library = 'shadcn', variant, children, ...props }) {
  if (library === 'daisyui') {
    const daisyClass = `btn ${variant ? `btn-${variant}` : ''}`;
    return <button className={daisyClass} {...props}>{children}</button>;
  }
  
  return <Button variant={variant} {...props}>{children}</Button>;
}
```

### Issue 4: Form validation styles inconsistent

**Symptoms**:
- Error states look different between form libraries
- Focus indicators don't match
- Validation messages have different styling

**Diagnosis Steps**:
1. Compare error state styling between libraries
2. Check focus state implementations
3. Verify validation message styling

**Solution**:
```css
/* Add to src/styles/daisyui-overrides.css */
/* Standardize form validation styles */
.input-bordered {
  border-color: hsl(var(--border));
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-bordered:focus {
  border-color: hsl(var(--ring));
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.input-error,
.input-bordered.input-error {
  border-color: hsl(var(--destructive));
}

.input-error:focus {
  outline-color: hsl(var(--destructive));
  border-color: hsl(var(--destructive));
}

/* Standardize error messages */
.error-message {
  color: hsl(var(--destructive));
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

### Issue 5: Responsive behavior inconsistencies

**Symptoms**:
- Components break at certain screen sizes
- Different breakpoint behavior between libraries
- Mobile usability issues

**Diagnosis Steps**:
1. Test components at different screen sizes
2. Check breakpoint definitions in both libraries
3. Verify responsive class usage

**Solution**:
```tsx
// Use consistent responsive patterns
function ResponsiveComponent() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* shadcn/ui card */}
      <Card className="w-full">
        <CardContent>Content</CardContent>
      </Card>
      
      {/* daisyUI card with same responsive behavior */}
      <div className="card bg-base-100 shadow-xl w-full">
        <div className="card-body">Content</div>
      </div>
    </div>
  );
}
```

### Issue 6: Build errors and configuration conflicts

**Symptoms**:
- Build fails with CSS errors
- Tailwind classes not recognized
- PostCSS configuration issues

**Diagnosis Steps**:
1. Check Tailwind configuration
2. Verify PostCSS setup
3. Check for plugin conflicts

**Solution**:
```typescript
// tailwind.config.ts - Ensure proper configuration
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Your theme extensions
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("daisyui")
  ],
  daisyui: {
    base: false, // Prevent conflicts with shadcn/ui
    themes: ["light", "dark"],
    darkTheme: "dark",
    styled: true,
    utils: true,
    logs: false,
  },
} satisfies Config;
```

### Issue 7: Performance issues with large CSS bundle

**Symptoms**:
- Slow page load times
- Large CSS bundle size
- Unused CSS in production

**Diagnosis Steps**:
1. Analyze CSS bundle size
2. Check for unused styles
3. Verify purging configuration

**Solution**:
```typescript
// Optimize Tailwind configuration for production
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Specific paths only
  ],
  // Enable JIT mode for better performance
  mode: 'jit',
  
  daisyui: {
    themes: ["light", "dark"], // Only include needed themes
    utils: false, // Disable if not using utility classes
    logs: false, // Disable logs in production
  },
} satisfies Config;
```

### Issue 8: Accessibility problems

**Symptoms**:
- Screen readers not working properly
- Keyboard navigation broken
- Missing ARIA attributes

**Diagnosis Steps**:
1. Test with screen readers
2. Check keyboard navigation
3. Verify ARIA attributes

**Solution**:
```tsx
// Ensure accessibility in mixed components
function AccessibleAlert({ type, children, ...props }) {
  const alertProps = {
    role: 'alert',
    'aria-live': type === 'error' ? 'assertive' : 'polite',
    ...props
  };
  
  return (
    <div className={`alert alert-${type}`} {...alertProps}>
      <span>{children}</span>
    </div>
  );
}

// Add focus management
function AccessibleButton({ children, onClick, ...props }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };
  
  return (
    <button 
      className="btn btn-primary"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Issue 9: TypeScript errors with daisyUI classes

**Symptoms**:
- TypeScript complains about unknown CSS classes
- Autocomplete not working for daisyUI classes
- Type checking errors in CI/CD

**Diagnosis Steps**:
1. Check TypeScript configuration
2. Verify CSS module types
3. Check for missing type definitions

**Solution**:
```typescript
// Create types/daisyui.d.ts
declare module 'daisyui' {
  export interface DaisyUITheme {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    'base-100': string;
    info: string;
    success: string;
    warning: string;
    error: string;
  }
}

// Use proper typing for className props
interface ComponentProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
}

function TypedComponent({ className, variant }: ComponentProps) {
  const buttonClass = `btn ${variant ? `btn-${variant}` : ''} ${className || ''}`;
  return <button className={buttonClass.trim()} />;
}
```

### Issue 10: Dark mode not working consistently

**Symptoms**:
- Some components stay light in dark mode
- Inconsistent dark mode colors
- Theme toggle not affecting all elements

**Diagnosis Steps**:
1. Check theme provider implementation
2. Verify CSS variable definitions for dark mode
3. Test theme persistence

**Solution**:
```css
/* Ensure comprehensive dark mode support */
.dark {
  /* Base colors */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  
  /* Component colors */
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  
  /* daisyUI specific overrides */
  --primary: 217 91% 60%;
  --primary-foreground: 222.2 84% 4.9%;
}

/* Force daisyUI components to use theme variables */
.dark .card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border-color: hsl(var(--border));
}

.dark .alert {
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.dark .btn {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

## Quick Diagnostic Checklist

When encountering integration issues, run through this checklist:

### Configuration Check
- [ ] daisyUI plugin added to `tailwind.config.ts`
- [ ] `base: false` set in daisyUI config
- [ ] ThemeProvider wraps the application
- [ ] CSS variables defined in `src/index.css`

### Component Check
- [ ] No mixed component classes on single elements
- [ ] Theme variables used instead of hard-coded colors
- [ ] Components tested in both light and dark modes
- [ ] Focus states work correctly
- [ ] Responsive behavior verified

### Build Check
- [ ] No build errors or warnings
- [ ] CSS bundle size reasonable
- [ ] All required styles included in production
- [ ] PostCSS configuration correct

### Accessibility Check
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Proper ARIA attributes
- [ ] Color contrast meets standards

## Emergency Fixes

### Quick CSS Reset
If styling is completely broken, add this emergency reset:

```css
/* Emergency reset - add to src/styles/emergency-reset.css */
.btn {
  all: revert;
  @apply inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors;
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
  @apply h-10 px-4 py-2;
}

.card {
  all: revert;
  @apply rounded-lg border bg-card text-card-foreground shadow-sm;
}

.alert {
  all: revert;
  @apply relative w-full rounded-lg border p-4;
}
```

### Force Theme Application
If theme switching is broken:

```tsx
// Add to your main App component
useEffect(() => {
  const applyTheme = () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  };
  
  applyTheme();
  window.addEventListener('storage', applyTheme);
  
  return () => window.removeEventListener('storage', applyTheme);
}, []);
```

## Testing Strategies

### Manual Testing

1. **Theme Toggle Test**
   ```tsx
   // Test all components with theme changes
   function ThemeTest() {
     const { setTheme } = useTheme();
     
     return (
       <div>
         <button onClick={() => setTheme('light')}>Light</button>
         <button onClick={() => setTheme('dark')}>Dark</button>
         {/* Test all your components here */}
       </div>
     );
   }
   ```

2. **Accessibility Test**
   - Use keyboard navigation
   - Test with screen readers
   - Verify color contrast

3. **Cross-browser Test**
   - Test in Chrome, Firefox, Safari
   - Verify mobile browsers
   - Check for vendor prefix issues

### Automated Testing

```tsx
// Component testing with theme variations
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';

function renderWithTheme(component, theme = 'light') {
  return render(
    <ThemeProvider defaultTheme={theme}>
      {component}
    </ThemeProvider>
  );
}

test('component works in both themes', () => {
  const { rerender } = renderWithTheme(<MyComponent />);
  // Test light theme
  
  rerender(
    <ThemeProvider defaultTheme="dark">
      <MyComponent />
    </ThemeProvider>
  );
  // Test dark theme
});
```

## Migration Strategies

### Gradual Migration

1. **Phase 1**: Add daisyUI without changing existing components
2. **Phase 2**: Replace simple components (alerts, badges)
3. **Phase 3**: Add new features with daisyUI
4. **Phase 4**: Optimize and consolidate

### Component Audit

```tsx
// Audit existing components for migration opportunities
const MIGRATION_CANDIDATES = {
  // Easy wins - replace immediately
  alerts: 'Replace with daisyUI alerts',
  badges: 'Replace with daisyUI badges',
  
  // Medium effort - replace gradually
  cards: 'Evaluate case by case',
  buttons: 'Keep shadcn/ui for forms, use daisyUI for actions',
  
  // Keep as-is - high effort, low benefit
  forms: 'Keep shadcn/ui',
  dialogs: 'Keep shadcn/ui',
};
```

## Resources

### Documentation
- [daisyUI Documentation](https://daisyui.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

### Tools
- Test page: `/daisyui-test`
- Theme toggle: Available in app header
- Browser dev tools for CSS debugging

### Support
- Check existing issues in project documentation
- Review conflict resolution examples
- Consult the development team for complex cases