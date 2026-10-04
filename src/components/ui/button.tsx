import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[14px] font-medium cursor-pointer transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        plain: "bg-control-fill text-foreground hover:bg-control-fill/70",
        "destructive-plain": "bg-control-fill text-destructive hover:bg-control-fill/70",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-card text-foreground hover:bg-control-fill/50",
        ghost: "text-foreground hover:bg-control-fill/60",
        secondary: "bg-control-fill text-foreground hover:bg-control-fill/70",
        link: "text-link underline-offset-4 hover:underline",
        site: "bg-site-primary text-site-on-primary hover:bg-site-primary-hover",
        siteSecondary: "bg-site-panel text-site-ink hover:bg-site-inner",
        siteTab: "text-site-nav hover:text-site-ink",
      },
      size: {
        header: "h-[34px] px-3.5",
        default: "h-10 px-5",
        main: "h-10 px-5",
        large: "h-[50px] px-7 text-[15px]",
        sm: "h-8 px-3 text-[13px]",
        icon: "h-[34px] w-[34px] rounded-lg",
        siteHeader: "h-10 rounded-lg px-[18px] text-[15px] font-normal max-md:h-11",
        site: "h-12 rounded-lg px-6 text-[17px] font-normal",
        siteTab: "h-10 rounded-lg px-[18px] text-[15px] font-medium",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
