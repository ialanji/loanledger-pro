import { Badge } from "@/components/ui/badge";
import { CreditType } from "@/types/credit";
import { cn } from "@/lib/utils";

interface CreditTypeDisplayProps {
  creditType: CreditType;
  className?: string;
}

const CREDIT_TYPE_CONFIG: Record<
  CreditType,
  { label: string; className: string }
> = {
  investment: {
    label: "Инвестиционный",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-blue-200",
  },
  working_capital: {
    label: "Оборотные средства",
    className: "bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200",
  },
};

export function CreditTypeDisplay({
  creditType,
  className,
}: CreditTypeDisplayProps) {
  const config = CREDIT_TYPE_CONFIG[creditType];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
