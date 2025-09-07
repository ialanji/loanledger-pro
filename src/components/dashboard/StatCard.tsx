import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const formatValue = (value: string | number): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('ro-MD', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value;
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className
}: StatCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'stat-card-primary';
      case 'success':
        return 'stat-card-success border-success/20';
      case 'warning':
        return 'stat-card border-warning/20 bg-warning/5';
      case 'danger':
        return 'stat-card border-destructive/20 bg-destructive/5';
      default:
        return 'stat-card';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-primary-foreground/80';
      case 'success':
        return 'text-success-foreground/80';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-destructive';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className={cn(getVariantStyles(), className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium mb-1",
            variant === 'primary' || variant === 'success' 
              ? "text-current/80" 
              : "text-muted-foreground"
          )}>
            {title}
          </p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className={cn(
              "text-2xl font-bold financial-amount",
              variant === 'primary' || variant === 'success' 
                ? "text-current" 
                : "text-foreground"
            )}>
              {formatValue(value)}
            </span>
            {trend && (
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "bg-success/20 text-success" 
                  : "bg-destructive/20 text-destructive"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className={cn(
              "text-xs",
              variant === 'primary' || variant === 'success' 
                ? "text-current/70" 
                : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="ml-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            variant === 'primary' || variant === 'success'
              ? "bg-white/20"
              : "bg-primary/10"
          )}>
            <Icon className={cn("w-6 h-6", getIconColor())} />
          </div>
        </div>
      </div>
    </div>
  );
}