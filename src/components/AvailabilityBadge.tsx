import { cn } from "@/lib/utils";
import { Package, PackageX, AlertTriangle } from "lucide-react";

interface AvailabilityBadgeProps {
  quantity: number;
  className?: string;
}

export default function AvailabilityBadge({ quantity, className }: AvailabilityBadgeProps) {
  if (quantity === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800",
          className
        )}
      >
        <PackageX className="h-3 w-3" />
        Out of Stock
      </span>
    );
  }

  if (quantity <= 10) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800",
          className
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Low Stock ({quantity})
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800",
        className
      )}
    >
      <Package className="h-3 w-3" />
      In Stock ({quantity})
    </span>
  );
}
