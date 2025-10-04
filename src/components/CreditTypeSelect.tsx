import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditType } from "@/types/credit";

interface CreditTypeSelectProps {
  value: CreditType;
  onValueChange: (value: CreditType) => void;
  disabled?: boolean;
}

const CREDIT_TYPE_LABELS: Record<CreditType, string> = {
  investment: "Инвестиционный",
  working_capital: "Оборотные средства",
};

export function CreditTypeSelect({
  value,
  onValueChange,
  disabled = false,
}: CreditTypeSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      defaultValue="investment"
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Выберите тип кредита" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="investment">
          {CREDIT_TYPE_LABELS.investment}
        </SelectItem>
        <SelectItem value="working_capital">
          {CREDIT_TYPE_LABELS.working_capital}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
