import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ className, children, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card p-5',
        hover && 'cursor-pointer transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h3 className="section-heading">{title}</h3>
        {description && <p className="text-sm text-stone-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  className?: string;
}) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-stone-400 mt-0.5">{sublabel}</p>}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium mt-1',
                trend.positive ? 'text-green-600' : 'text-red-600',
              )}
            >
              {trend.positive ? '+' : ''}{trend.value}% vs last period
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
