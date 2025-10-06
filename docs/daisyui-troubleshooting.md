# daisyUI Troubleshooting Guide

Quick solutions for common daisyUI integration issues.

## Quick Fixes

### Theme Not Working

**Symptoms**: Components don't change appearance when switching themes.

**Quick Fix**:
```tsx
// 1. Ensure ThemeProvider wraps your app
import { ThemeProvider } from '@/components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      {/* Your app content */}
    </ThemeProvider>
  );
}

// 2. Check CSS variables are loaded
// Verify src/index.css contains theme variables
```

### Build Errors

**Symptoms**: Build fails with CSS or Tailwind errors.

**Quick Fix**:
```bash
# 1. Clear build cache
rm -rf dist node_modules/.vite

# 2. Reinstall dependencies
npm install

# 3. Verify Tailwind config
# Check tailwind.config.ts has daisyUI plugin
```

### Components Look Wrong

**Symptoms**: daisyUI components don't match expected appearance.

**Quick Fix**:
```css
/* Add to src/styles/daisyui-overrides.css */
.btn {
  border-radius: var(--radius);
}

.card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
}
```

### Focus States Missing

**Symptoms**: No focus indicators on interactive elements.

**Quick Fix**:
```css
/* Add focus styles */
.btn:focus-visible,
.input:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

## Common Issues

### Issue 1: Mixed Component Classes

**Problem**:
```tsx
// This causes conflicts
<Button className="btn btn-primary">Mixed classes</Button>
```

**Solution**:
```tsx
// Use components separately
<Button>shadcn/ui button</Button>
<button className="btn btn-primary">daisyUI button</button>
```

### Issue 2: Theme Variables Not Applied

**Problem**: Hard-coded colors breaking theme system.

**Solution**:
```tsx
// ❌ Hard-coded colors
<div className="bg-blue-500 text-white">

// ✅ Theme variables
<div className="bg-primary text-primary-foreground">
```

### Issue 3: Inconsistent Spacing

**Problem**: Different spacing between component libraries.

**Solution**:
```tsx
// Use consistent Tailwind spacing
<div className="space-y-4">
  <Button>shadcn/ui button</Button>
  <button className="btn btn-primary">daisyUI button</button>
</div>
```

### Issue 4: Dark Mode Not Working

**Problem**: Some components don't adapt to dark mode.

**Solution**:
```css
/* Ensure dark mode styles are applied */
.dark .card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
}

.dark .alert {
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}
```

### Issue 5: TypeScript Errors

**Problem**: TypeScript complains about daisyUI classes.

**Solution**:
```tsx
// Use proper typing for className
interface Props {
  className?: string;
}

function MyComponent({ className }: Props) {
  return <div className={`btn ${className}`} />;
}
```

## Debugging Steps

### Step 1: Check Configuration

1. Verify `tailwind.config.ts`:
```typescript
plugins: [require("tailwindcss-animate"), require("daisyui")]
```

2. Check `daisyui` configuration:
```typescript
daisyui: {
  base: false,
  themes: ["light", "dark"],
  darkTheme: "dark",
}
```

### Step 2: Inspect CSS

1. Open browser dev tools
2. Check if daisyUI classes are present
3. Look for CSS conflicts in computed styles
4. Verify CSS variables are defined

### Step 3: Test Theme System

1. Use theme toggle in app header
2. Check if `html` element gets theme classes
3. Verify CSS variables change with theme

### Step 4: Component Isolation

1. Test components individually
2. Remove custom styles temporarily
3. Check if issue persists with minimal setup

## Error Messages

### "Cannot resolve module 'daisyui'"

**Cause**: daisyUI not installed or not found.

**Fix**:
```bash
npm install daisyui
# or
npm install daisyui@latest
```

### "Unknown at-rule @tailwind"

**Cause**: PostCSS not configured properly.

**Fix**:
```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### "Class 'btn' not found"

**Cause**: daisyUI plugin not loaded in Tailwind.

**Fix**:
```typescript
// tailwind.config.ts
plugins: [require("daisyui")]
```

### Build size warnings

**Cause**: daisyUI adds CSS bundle size.

**Fix**:
```typescript
// Use purge/content to remove unused styles
content: ["./src/**/*.{js,ts,jsx,tsx}"]
```

## Performance Issues

### Large CSS Bundle

**Problem**: CSS bundle too large with daisyUI.

**Solutions**:
1. Use `content` purging in Tailwind config
2. Disable unused daisyUI components
3. Use dynamic imports for large components

```typescript
// tailwind.config.ts
daisyui: {
  themes: ["light", "dark"], // Only include needed themes
  utils: false, // Disable if not using utility classes
}
```

### Slow Build Times

**Problem**: Build takes longer with daisyUI.

**Solutions**:
1. Use Tailwind JIT mode
2. Optimize content paths
3. Use build caching

```typescript
// vite.config.ts
export default {
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ["./src/**/*.{js,ts,jsx,tsx}"] // Specific paths only
        })
      ]
    }
  }
}
```

## Browser Compatibility

### Safari Issues

**Problem**: Some daisyUI components don't work in Safari.

**Solution**:
```css
/* Add Safari-specific fixes */
@supports (-webkit-appearance: none) {
  .btn {
    -webkit-appearance: none;
  }
}
```

### Internet Explorer

**Problem**: daisyUI doesn't support IE.

**Solution**: Use feature detection and fallbacks:
```tsx
function ModernComponent() {
  const supportsModernCSS = CSS.supports('display', 'grid');
  
  if (!supportsModernCSS) {
    return <LegacyComponent />;
  }
  
  return <DaisyUIComponent />;
}
```

## Testing Issues

### Components Not Rendering in Tests

**Problem**: daisyUI components don't render properly in Jest tests.

**Solution**:
```tsx
// Setup test environment
import '@testing-library/jest-dom';

// Mock CSS imports
jest.mock('../src/index.css', () => ({}));

// Provide theme context
function renderWithTheme(component) {
  return render(
    <ThemeProvider defaultTheme="light">
      {component}
    </ThemeProvider>
  );
}
```

### Snapshot Tests Failing

**Problem**: CSS classes change between test runs.

**Solution**:
```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  }
};
```

## Development Tools

### VS Code Extensions

Recommended extensions for better daisyUI development:

1. **Tailwind CSS IntelliSense**: Autocomplete for classes
2. **PostCSS Language Support**: CSS syntax highlighting
3. **Auto Rename Tag**: Keep HTML tags in sync

### Browser Extensions

1. **React Developer Tools**: Debug component state
2. **Tailwind CSS Devtools**: Inspect Tailwind classes

### Debugging Commands

```bash
# Check if daisyUI is installed
npm list daisyui

# Verify Tailwind build
npx tailwindcss --help

# Check PostCSS configuration
npx postcss --version

# Build with verbose output
npm run build -- --verbose
```

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Review the integration documentation
3. Test with the `/daisyui-test` page
4. Check browser console for errors
5. Verify your configuration matches the examples

### Where to Get Help

1. **Project Documentation**: Check `docs/` folder
2. **Test Page**: Visit `/daisyui-test` for examples
3. **daisyUI Documentation**: [daisyui.com](https://daisyui.com/)
4. **Community**: GitHub issues and discussions

### Information to Include

When reporting issues, include:

1. **Environment**:
   - Node.js version
   - npm/yarn version
   - Browser and version

2. **Configuration**:
   - `tailwind.config.ts` content
   - `package.json` dependencies
   - Build tool configuration

3. **Code Example**:
   - Minimal reproduction case
   - Expected vs actual behavior
   - Error messages or screenshots

4. **Steps to Reproduce**:
   - Clear step-by-step instructions
   - Any specific conditions or setup required