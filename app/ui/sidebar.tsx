import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const SIDEBAR_CONTENT_SELECTOR = '[data-sidebar="content"]';

const SIDEBAR_GROUP_LABEL_BASE_CLASS =
  "duration-200 flex shrink-0 items-center rounded-md px-1 text-xs font-medium text-sidebar-foreground/75 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>[data-icon-root]]:size-4 [&>[data-icon-root]]:shrink-0";

export function useSidebarContentElement(
  anchorRef: React.RefObject<HTMLElement | null>,
): HTMLElement | null {
  const [element, setElement] = React.useState<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    const next =
      anchorRef.current?.closest<HTMLElement>(SIDEBAR_CONTENT_SELECTOR) ?? null;
    setElement((current) => (current === next ? current : next));
  }, [anchorRef]);
  return element;
}

export const SidebarContentElementContext =
  React.createContext<React.RefObject<HTMLElement | null> | null>(null);

export function useSidebarContentElementRef(): React.RefObject<HTMLElement | null> | null {
  return React.useContext(SidebarContentElementContext);
}

export function SidebarContentElementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const element = useSidebarContentElement(anchorRef);
  const contentRef = React.useMemo(() => ({ current: element }), [element]);
  return (
    <SidebarContentElementContext.Provider value={contentRef}>
      <div ref={anchorRef} className="contents">
        {children}
      </div>
    </SidebarContentElementContext.Provider>
  );
}

type SidebarStickyTierKind = "label" | "project" | "parent";

type SidebarStickyStackProps = React.ComponentProps<"div">;

interface SidebarStickyTierProps extends React.ComponentProps<"div"> {
  tier: SidebarStickyTierKind;
  level?: number;
}

type SidebarStickyParentLevelStyle = React.CSSProperties & {
  "--bb-sidebar-sticky-parent-level": number;
};

export const SidebarStickyStack = React.forwardRef<
  HTMLDivElement,
  SidebarStickyStackProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      data-sidebar-sticky-stack=""
      className={cn("relative flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  );
});
SidebarStickyStack.displayName = "SidebarStickyStack";

export const SidebarStickyTier = React.forwardRef<
  HTMLDivElement,
  SidebarStickyTierProps
>(({ children, className, tier, level, style, ...props }, ref) => {
  const ownRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLSpanElement>(null);
  const [pinned, setPinned] = React.useState(false);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      ownRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );
  React.useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const own = ownRef.current,
        sentinel = sentinelRef.current;
      if (own && sentinel)
        setPinned(
          sentinel.getBoundingClientRect().top <
            own.getBoundingClientRect().top - 0.5,
        );
    };
    const schedule = () => {
      if (!frame)
        frame = window.requestAnimationFrame
          ? window.requestAnimationFrame(measure)
          : window.setTimeout(measure, 0);
    };
    measure();
    // Observe our own boxes. The event source's DOM and styles are never read.
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : null;
    if (ownRef.current) observer?.observe(ownRef.current);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      if (frame) {
        if (window.cancelAnimationFrame) window.cancelAnimationFrame(frame);
        else window.clearTimeout(frame);
      }
    };
  }, []);
  const tierStyle =
    tier === "parent" && level !== undefined
      ? ({
          ...style,
          "--bb-sidebar-sticky-parent-level": level,
        } satisfies SidebarStickyParentLevelStyle)
      : style;
  return (
    <>
      <span
        ref={sentinelRef}
        className="wb-sticky-sentinel"
        aria-hidden="true"
      />
      <div
        ref={setRef}
        {...props}
        style={tierStyle}
        data-sidebar={tier === "label" ? "group-label" : undefined}
        data-sidebar-sticky-tier={tier}
        data-workbench-pinned={pinned ? "true" : undefined}
        className={cn(
          tier === "label" && SIDEBAR_GROUP_LABEL_BASE_CLASS,
          "bg-sidebar",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
});
SidebarStickyTier.displayName = "SidebarStickyTier";

type SidebarStickyGroupProps = React.ComponentProps<"div">;

export const SidebarStickyGroup = React.forwardRef<
  HTMLDivElement,
  SidebarStickyGroupProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar-sticky-group=""
      className={cn(className)}
      {...props}
    />
  );
});
SidebarStickyGroup.displayName = "SidebarStickyGroup";

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

type SkeletonWidthStyle = React.CSSProperties & { "--skeleton-width": string };

export const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const skeletonId = React.useId();

  const width = React.useMemo(() => {
    let hash = 0;
    for (let index = 0; index < skeletonId.length; index += 1) {
      hash = (hash + skeletonId.charCodeAt(index) * (index + 1)) % 40;
    }
    return `${hash + 50}%`;
  }, [skeletonId]);
  const skeletonStyle: SkeletonWidthStyle = { "--skeleton-width": width };

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
      {...props}
    >
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={skeletonStyle}
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
