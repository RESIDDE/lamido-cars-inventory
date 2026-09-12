import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className" | "style"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
  inactiveStyle?: React.CSSProperties;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, style, activeStyle, inactiveStyle, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        style={({ isActive }) => ({
          ...style,
          ...(isActive ? activeStyle : inactiveStyle),
        })}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
