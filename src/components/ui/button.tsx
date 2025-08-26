import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-[var(--transition-normal)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--button-shadow)] hover:bg-[hsl(var(--primary-hover))] rounded-[var(--button-radius)]",
        primary:
          "text-white shadow-[var(--button-shadow)] rounded-[var(--button-radius)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--button-shadow)] hover:bg-[hsl(var(--secondary-hover))] rounded-[var(--button-radius)]",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shadow-[var(--button-shadow)] hover:bg-[hsl(var(--success-hover))] rounded-[var(--button-radius)]",
        warning:
          "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] shadow-[var(--button-shadow)] hover:bg-[hsl(var(--warning-hover))] rounded-[var(--button-radius)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--button-shadow)] hover:bg-[hsl(var(--destructive-hover))] rounded-[var(--button-radius)]",
        info:
          "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] shadow-[var(--button-shadow)] hover:bg-[hsl(var(--info-hover))] rounded-[var(--button-radius)]",
        outline:
          "border border-input bg-background shadow-[var(--button-shadow)] hover:bg-accent hover:text-accent-foreground rounded-[var(--button-radius)]",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground rounded-[var(--button-radius)]",
        link: 
          "text-primary underline-offset-4 hover:underline",
        // Deprecated variants - kept for backward compatibility
        "dark-primary":
          "bg-gray-800 text-white shadow hover:bg-gray-700 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-[var(--button-radius)]",
        "dark-secondary":
          "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-1000 rounded-[var(--button-radius)]",
        "dark-outline":
          "border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-100 dark:border-gray-600 dark:bg-black dark:text-gray-100 dark:hover:bg-gray-700 rounded-[var(--button-radius)]",
      },
      size: {
        sm: "h-[var(--button-height-sm)] px-[var(--button-padding-x-sm)] text-xs",
        default: "h-[var(--button-height-md)] px-[var(--button-padding-x-md)]",
        lg: "h-[var(--button-height-lg)] px-[var(--button-padding-x-lg)]",
        xl: "h-[var(--button-height-xl)] px-[var(--button-padding-x-xl)]",
        icon: "h-[var(--button-height-md)] w-[var(--button-height-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        data-variant={variant}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
