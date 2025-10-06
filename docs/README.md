# daisyUI Integration Documentation

Complete documentation for daisyUI integration in the NANU Financial System.

## 📚 Documentation Overview

This documentation provides everything you need to successfully use daisyUI alongside shadcn/ui in the project.

### Quick Start
- **New to daisyUI?** Start with [Integration Guide](./daisyui-integration.md)
- **Need quick reference?** Check [Quick Reference](./daisyui-quick-reference.md)
- **Having issues?** See [Troubleshooting Guide](./daisyui-troubleshooting.md)

## 📖 Documentation Files

### 1. [Integration Guide](./daisyui-integration.md)
**Complete integration documentation**
- Installation and configuration
- Usage patterns and best practices
- Theme system integration
- Component selection guidelines
- Performance considerations

### 2. [Quick Reference](./daisyui-quick-reference.md)
**Component cheat sheet**
- Button variants and sizes
- Form components
- Cards and layouts
- Color classes
- Common patterns

### 3. [Usage Examples](./daisyui-examples.md)
**Practical implementation examples**
- Financial dashboard components
- Form implementations
- Data display patterns
- Mixed component usage
- Responsive designs

### 4. [Conflict Resolution](./daisyui-conflict-resolution.md)
**Comprehensive conflict management**
- Common conflict types
- Detection strategies
- Resolution techniques
- Prevention best practices
- Migration strategies

### 5. [Troubleshooting Guide](./daisyui-troubleshooting.md)
**Quick fixes and solutions**
- Common issues and solutions
- Error message explanations
- Performance optimization
- Browser compatibility
- Testing strategies

## 🚀 Getting Started

### 1. Test the Integration
Visit the test page to see daisyUI in action:
```
http://localhost:8091/daisyui-test
```

### 2. Review the Configuration
Check the current setup in:
- `tailwind.config.ts` - daisyUI plugin configuration
- `src/index.css` - Theme variables and overrides
- `src/components/theme-provider.tsx` - Theme system

### 3. Start Using Components
Follow the patterns in the [Usage Examples](./daisyui-examples.md):

```tsx
// Quick alert
<div className="alert alert-success">
  <span>Operation successful!</span>
</div>

// Statistics display
<div className="stats shadow">
  <div className="stat">
    <div className="stat-title">Total Credits</div>
    <div className="stat-value">1,234</div>
  </div>
</div>
```

## 🎯 Key Principles

### 1. Component Separation
Use the right tool for the job:
- **shadcn/ui**: Complex forms, dialogs, navigation
- **daisyUI**: Alerts, stats, quick prototyping

### 2. Theme Consistency
Always use CSS variables for colors:
```tsx
// ✅ Good - uses theme variables
<div className="bg-primary text-primary-foreground">

// ❌ Bad - hard-coded colors
<div className="bg-blue-500 text-white">
```

### 3. Avoid Mixing Classes
Don't mix component classes on the same element:
```tsx
// ❌ Bad
<Button className="btn btn-primary">Mixed classes</Button>

// ✅ Good
<Button>shadcn/ui button</Button>
<button className="btn btn-primary">daisyUI button</button>
```

## 🛠️ Development Workflow

### 1. Choose Component Library
Refer to the decision matrix in [Integration Guide](./daisyui-integration.md#when-to-use-each-library)

### 2. Implement Component
Follow patterns from [Usage Examples](./daisyui-examples.md)

### 3. Test Theme Compatibility
Use the theme toggle to verify appearance in both modes

### 4. Check for Conflicts
Review [Conflict Resolution](./daisyui-conflict-resolution.md) if issues arise

### 5. Optimize Performance
Follow guidelines in [Integration Guide](./daisyui-integration.md#performance-considerations)

## 🔧 Configuration Reference

### Tailwind Configuration
```typescript
// tailwind.config.ts
export default {
  plugins: [require("tailwindcss-animate"), require("daisyui")],
  daisyui: {
    base: false, // Prevents conflicts with shadcn/ui
    themes: ["light", "dark"],
    darkTheme: "dark",
    styled: true,
    utils: true,
    logs: false,
  },
} satisfies Config;
```

### Theme Provider Setup
```tsx
// App.tsx
<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
  <App />
</ThemeProvider>
```

### CSS Overrides
```css
/* src/styles/daisyui-overrides.css */
@layer components {
  .btn:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
}
```

## 📊 Bundle Impact

### CSS Bundle Size
- **Before daisyUI**: ~74KB
- **After daisyUI**: ~149KB
- **Gzipped**: ~24KB (acceptable for the functionality gained)

### Performance Optimization
- Use content purging in Tailwind config
- Only include needed themes
- Consider code splitting for large applications

## 🧪 Testing

### Manual Testing
1. **Theme Toggle**: Test light/dark mode switching
2. **Component Interaction**: Verify focus states and hover effects
3. **Responsive Design**: Test on different screen sizes
4. **Cross-browser**: Verify compatibility

### Automated Testing
```tsx
// Test with theme provider
function renderWithTheme(component, theme = 'light') {
  return render(
    <ThemeProvider defaultTheme={theme}>
      {component}
    </ThemeProvider>
  );
}
```

## 🆘 Need Help?

### Quick Solutions
1. **Check [Troubleshooting Guide](./daisyui-troubleshooting.md)** for common issues
2. **Visit `/daisyui-test`** to see working examples
3. **Review [Conflict Resolution](./daisyui-conflict-resolution.md)** for styling issues

### Reporting Issues
Include:
- Environment details (Node.js, browser versions)
- Configuration files (tailwind.config.ts, package.json)
- Minimal reproduction case
- Expected vs actual behavior

## 📈 Migration Path

### Phase 1: Foundation (Completed)
- ✅ Install and configure daisyUI
- ✅ Set up theme system
- ✅ Create documentation
- ✅ Implement conflict resolution

### Phase 2: Gradual Adoption
- Replace simple components (alerts, badges)
- Add daisyUI to new features
- Maintain existing shadcn/ui components

### Phase 3: Optimization
- Audit component usage
- Optimize bundle size
- Consolidate patterns

## 🔗 External Resources

- [daisyUI Official Documentation](https://daisyui.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)

## 📝 Contributing

When adding new daisyUI components or patterns:

1. **Follow established patterns** from the examples
2. **Test theme compatibility** in both light and dark modes
3. **Update documentation** if introducing new patterns
4. **Check for conflicts** with existing components
5. **Add examples** to the test page if needed

---

**Last Updated**: January 2025  
**daisyUI Version**: 5.1.27  
**Project**: NANU Financial System