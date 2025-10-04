# CreditTypeSelect Component

## Overview
A reusable dropdown component for selecting credit types in forms. Built using shadcn/ui Select component.

## Features
✅ Two credit type options with Russian labels
✅ Maps display labels to enum values ('investment', 'working_capital')
✅ Default value set to 'investment'
✅ Supports disabled prop for read-only mode
✅ Type-safe with TypeScript
✅ Consistent with existing UI components

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| value | CreditType | Yes | - | Current selected credit type |
| onValueChange | (value: CreditType) => void | Yes | - | Callback when selection changes |
| disabled | boolean | No | false | Disables the select when true |

## Credit Type Options

| Value | Display Label (Russian) |
|-------|------------------------|
| investment | Инвестиционный |
| working_capital | Оборотные средства |

## Usage Examples

### Basic Usage
```tsx
import { CreditTypeSelect } from "@/components/CreditTypeSelect";
import { CreditType } from "@/types/credit";

function MyForm() {
  const [creditType, setCreditType] = useState<CreditType>("investment");

  return (
    <CreditTypeSelect
      value={creditType}
      onValueChange={setCreditType}
    />
  );
}
```

### With React Hook Form
```tsx
import { useForm } from "react-hook-form";
import { CreditTypeSelect } from "@/components/CreditTypeSelect";

function CreditForm() {
  const { watch, setValue } = useForm({
    defaultValues: {
      creditType: "investment" as CreditType
    }
  });

  return (
    <CreditTypeSelect
      value={watch("creditType")}
      onValueChange={(value) => setValue("creditType", value)}
    />
  );
}
```

### Disabled State (Read-only)
```tsx
<CreditTypeSelect
  value={creditType}
  onValueChange={setCreditType}
  disabled={true}
/>
```

## Requirements Satisfied

- ✅ **Requirement 2.1**: Dropdown field in Basic Information section
- ✅ **Requirement 2.2**: Defaults to "Investment"
- ✅ **Requirement 2.3**: Two options with Russian labels
- ✅ **Requirement 3.4**: Supports disabled prop for read-only mode

## Implementation Details

- Uses shadcn/ui Select primitives for consistent styling
- Type-safe with CreditType union type
- Includes placeholder text in Russian
- Follows project naming conventions
- Integrates seamlessly with existing form components

## Testing

See `src/components/__tests__/CreditTypeSelect.test.tsx` for comprehensive test coverage including:
- Default value rendering
- Label display for both types
- Disabled state
- Dropdown interaction
- Value change callback
