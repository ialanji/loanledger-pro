# CreditTypeDisplay Component

## Overview

The `CreditTypeDisplay` component is a badge/label component designed to display credit types in the credits list and other views. It provides visual distinction between different credit types using color-coded badges.

## Features

- Displays credit type with localized Russian labels
- Color-coded badges for visual distinction:
  - **Investment** (Инвестиционный): Blue styling
  - **Working Capital** (Оборотные средства): Green styling
- Consistent styling with existing shadcn/ui components
- Supports custom className for additional styling
- Fully typed with TypeScript

## Usage

### Basic Usage

```tsx
import { CreditTypeDisplay } from '@/components/CreditTypeDisplay';

function CreditRow({ credit }) {
  return (
    <div>
      <span>{credit.contractNumber}</span>
      <CreditTypeDisplay creditType={credit.creditType} />
    </div>
  );
}
```

### In a Table

```tsx
<Table>
  <TableBody>
    {credits.map((credit) => (
      <TableRow key={credit.id}>
        <TableCell>{credit.contractNumber}</TableCell>
        <TableCell>
          <CreditTypeDisplay creditType={credit.creditType} />
        </TableCell>
        <TableCell>{formatCurrency(credit.principal)}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### With Custom Styling

```tsx
<CreditTypeDisplay 
  creditType="investment" 
  className="ml-2" 
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `creditType` | `CreditType` | Yes | - | The type of credit to display ('investment' or 'working_capital') |
| `className` | `string` | No | - | Additional CSS classes to apply to the badge |

## Credit Type Mapping

| Value | Label | Color Scheme |
|-------|-------|--------------|
| `investment` | Инвестиционный | Blue (bg-blue-100, text-blue-800, border-blue-200) |
| `working_capital` | Оборотные средства | Green (bg-green-100, text-green-800, border-green-200) |

## Styling

The component uses Tailwind CSS classes and is built on top of the shadcn/ui Badge component with the `outline` variant. The color schemes are designed to be:

- **Accessible**: High contrast between text and background
- **Consistent**: Matches the existing UI design system
- **Distinctive**: Easy to distinguish between types at a glance

## Implementation Details

- Built using shadcn/ui `Badge` component
- Uses `cn()` utility for className merging
- Type-safe with TypeScript
- Follows the project's component structure and naming conventions

## Requirements Satisfied

This component satisfies the following requirements from the credit type classification feature:

- **Requirement 4.2**: Maps 'investment' to "Инвестиционный"
- **Requirement 4.3**: Maps 'working_capital' to "Оборотные средства"
- Uses consistent styling with existing UI components
- Provides visual distinction through color coding

## Testing

The component includes comprehensive tests covering:
- Correct label rendering for both credit types
- Proper styling application (blue for investment, green for working capital)
- Custom className support
- TypeScript type safety

## Integration Notes

When integrating this component into the Credits list (Task 10):

1. Import the component: `import { CreditTypeDisplay } from '@/components/CreditTypeDisplay';`
2. Add it to the credit row/card where credit information is displayed
3. Pass the `credit.creditType` prop
4. Ensure the API returns the `creditType` field (already implemented in previous tasks)

## Example in Context

```tsx
// In Credits.tsx
import { CreditTypeDisplay } from '@/components/CreditTypeDisplay';

// Inside the credit list rendering
<div className="flex items-center gap-2">
  <span className="font-medium">{credit.contractNumber}</span>
  <CreditTypeDisplay creditType={credit.creditType} />
  <span className="text-muted-foreground">{credit.bank?.name}</span>
</div>
```
