import { CreditType } from '@/types/credit';
import { cn } from '@/lib/utils';

interface CreditTypeTotalCardProps {
  type: CreditType;
  total: number;
  label: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ro-MD', {
    style: 'currency',
    currency: 'MDL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MDL', '₽');
};

export default function CreditTypeTotalCard({
  type,
  total,
  label
}: CreditTypeTotalCardProps) {
  const isInvestment = type === 'investment';
  
  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-lg p-4 border",
      isInvestment 
        ? "border-blue-200 dark:border-blue-800" 
        : "border-green-200 dark:border-green-800"
    )}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className={cn(
        "text-2xl font-bold mb-1",
        isInvestment 
          ? "text-blue-600 dark:text-blue-400" 
          : "text-green-600 dark:text-green-400"
      )}>
        {formatCurrency(total)}
      </p>
      <p className="text-xs text-muted-foreground">
        {isInvestment ? 'Инвестиционные кредиты' : 'Оборотные средства'}
      </p>
    </div>
  );
}
