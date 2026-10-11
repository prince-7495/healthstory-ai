/* =============================================================
   Icon set — hand-drawn SVGs, no icon library dependency.
   All icons are stroke-based, 1.6px, rounded caps, so they share
   one visual language. Decorative by default: pass `title` when an
   icon is the only label for something meaningful.
   ============================================================= */

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
  strokeWidth?: number;
  /** Escape hatch for the rare case an icon must be aligned inline. */
  style?: React.CSSProperties;
};

function Svg({
  size = 20,
  className,
  title,
  strokeWidth = 1.6,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ---- Logo: health + timeline + story ----
   A continuous line that reads as a timeline, with the rising part
   forming an implied pulse. No medical cross. */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="9"
        fill="url(#hs-logo-fill)"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1"
      />
      {/* the story line: starts low, pulses, rises */}
      <path
        d="M6 20.5h4.2l1.9-6.1 2.6 9.4 2.2-6.6 1.6 3.3H26"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="20.5" r="1.9" fill="#fff" />
      <defs>
        <linearGradient id="hs-logo-fill" x1="4" y1="3" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C8093" />
          <stop offset="1" stopColor="#0B4F5D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ---- Section icons ---- */
export function PulseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12h3.2l2.1-5.6 3.4 11.2 2.6-8 1.9 2.4h5.8" />
    </Svg>
  );
}

export function TimelineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3v18" />
      <circle cx="7" cy="7.5" r="2" />
      <circle cx="7" cy="16.5" r="2" />
      <path d="M11.5 7.5H20M11.5 16.5H17" />
    </Svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M13.5 3v4a1.5 1.5 0 0 0 1.5 1.5h4" />
      <path d="M8.6 12.6h6.8M8.6 16h4.6" />
    </Svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 21l1.3-3.7A6.9 6.9 0 0 1 3.5 12.4c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
      <path d="M8.8 12h.01M12 12h.01M15.2 12h.01" strokeWidth="2.2" />
    </Svg>
  );
}

export function ReadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.6C10.4 5.2 8.2 4.6 4.5 4.9v12.6c3.7-.3 5.9.3 7.5 1.7 1.6-1.4 3.8-2 7.5-1.7V4.9c-3.7-.3-5.9.3-7.5 1.7Z" />
      <path d="M12 6.6v13" />
    </Svg>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.2" y="4" width="17.6" height="4.2" rx="1.4" />
      <path d="M5 8.2V19a1.6 1.6 0 0 0 1.6 1.6h10.8A1.6 1.6 0 0 0 19 19V8.2" />
      <path d="M10 12.4h4" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.2s7-3.1 7-8.5V5.9L12 3 5 5.9v6.8c0 5.4 7 8.5 7 8.5Z" />
      <path d="M9.2 11.9l2 2 3.6-3.9" />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.4" width="15" height="10.1" rx="2.2" />
      <path d="M8.1 10.4V7.6a3.9 3.9 0 0 1 7.8 0v2.8" />
      <path d="M12 14.4v2.2" />
    </Svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.4 12S6 6.2 12 6.2 21.6 12 21.6 12 18 17.8 12 17.8 2.4 12 2.4 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20c.6-3.7 3.6-5.8 7.2-5.8s6.6 2.1 7.2 5.8" />
    </Svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l1.7 4.6 4.8 1.7-4.8 1.7L12 16.1l-1.7-4.6L5.5 9.8l4.8-1.7L12 3.5Z" />
      <path d="M18.5 15.5l.7 1.9 2 .7-2 .7-.7 1.9-.7-1.9-2-.7 2-.7.7-1.9Z" strokeWidth="1.3" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.4c2.2 2.4 3.3 5.4 3.3 8.6S14.2 18.2 12 20.6c-2.2-2.4-3.3-5.4-3.3-8.6S9.8 5.8 12 3.4Z" />
    </Svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M12 4.5v14M6.5 13.5 12 19l5.5-5.5" />
    </Svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M12 19.5v-14M6.5 10.5 12 5l5.5 5.5" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Svg>
  );
}

export function MinusTrendIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.7}>
      <path d="M3.5 7.5 9 13l3.6-3.6L20.5 17" />
      <path d="M15.6 17h4.9v-4.9" />
    </Svg>
  );
}

export function PlusTrendIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.7}>
      <path d="M3.5 16.5 9 11l3.6 3.6L20.5 6.7" />
      <path d="M15.6 6.7h4.9v4.9" />
    </Svg>
  );
}

export function NewTagIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.8v8.4M7.8 12h8.4" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M4 7.5h16M4 12h16M4 16.5h16" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M6.2 6.2l11.6 11.6M17.8 6.2 6.2 17.8" />
    </Svg>
  );
}

export function QuoteIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.5}>
      <path d="M9.6 6.2C6.6 7.4 5 9.7 5 12.9c0 2.9 1.6 4.9 3.9 4.9 2 0 3.5-1.4 3.5-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.6 1.4-2.9 3.2-3.8l-2.2-1.5ZM19 6.2c-3 1.2-4.6 3.5-4.6 6.7 0 2.9 1.6 4.9 3.9 4.9 2 0 3.5-1.4 3.5-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.6 1.4-2.9 3.2-3.8L19 6.2Z" />
    </Svg>
  );
}

/* ---- Stage 2 workspace icons ----
   Same stroke language as the set above so the product screen feels
   like the same brand as the landing page. */

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9.2" y="3.2" width="5.6" height="10.4" rx="2.8" />
      <path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 18v3" />
    </Svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2.4" />
    </Svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.6 5.6v12.8M14.4 5.6v12.8" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={2}>
      <path d="m5.2 12.6 4.4 4.3L18.8 7.2" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M12 5.6v12.8M5.6 12h12.8" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.4 4.6a2.1 2.1 0 0 1 3 3L9.6 17.4l-4 1 1-4 9.8-9.8Z" />
      <path d="m14.4 6.6 3 3" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.8 6.8h14.4" />
      <path d="M9.4 6.8V5.4a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v1.4" />
      <path d="M6.6 6.8l.9 11.6a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-11.6" />
      <path d="M10.4 10.4v6M13.6 10.4v6" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8.6" y="8.6" width="11.2" height="11.2" rx="2.4" />
      <path d="M15.4 8.6V6.2a2.2 2.2 0 0 0-2.2-2.2H6.2A2.2 2.2 0 0 0 4 6.2v7a2.2 2.2 0 0 0 2.2 2.2h2.4" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="m6.4 9.6 5.6 5.2 5.6-5.2" />
    </Svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 16.4V4.8" />
      <path d="m7.6 9.2 4.4-4.4 4.4 4.4" />
      <path d="M4.8 16.2v1.6a2.4 2.4 0 0 0 2.4 2.4h9.6a2.4 2.4 0 0 0 2.4-2.4v-1.6" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.4 21 19.6H3L12 4.4Z" />
      <path d="M12 10v3.8" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.4" />
      <circle cx="12" cy="8.1" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function QuestionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M9.7 9.6a2.4 2.4 0 0 1 4.6.8c0 1.6-2.3 1.9-2.3 3.4" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ArrowUpIconSmall(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M12 19V5" />
      <path d="m6.2 10.6 5.8-5.8 5.8 5.8" />
    </Svg>
  );
}

export function ArrowDownIconSmall(props: IconProps) {
  return (
    <Svg {...props} strokeWidth={1.8}>
      <path d="M12 5v14" />
      <path d="m6.2 13.4 5.8 5.8 5.8-5.8" />
    </Svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12c1.9-3.3 4.8-5 8-5s6.1 1.7 8 5c-1.9 3.3-4.8 5-8 5s-6.1-1.7-8-5Z" />
      <path d="m5.4 5.4 13.2 13.2" />
    </Svg>
  );
}

/* ---- Stage 9 insights icons ---- */

export function GraphIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="6.5" r="2.1" />
      <circle cx="18" cy="5" r="2.1" />
      <circle cx="14.5" cy="17.5" r="2.1" />
      <circle cx="6" cy="18.5" r="2.1" />
      <path d="M7.3 8.1 16 15.4M17.4 7 15.6 15.7M7.6 8.2 6.7 16.4" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.5 15.5 4.2 4.2" />
    </Svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.6 6.5h11M8.6 12h11M8.6 17.5h8" />
      <circle cx="4.6" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.6 14.4 14.4 9.6" />
      <path d="M10.7 6.9 13 4.6a3.4 3.4 0 0 1 4.8 4.8l-2.3 2.3" />
      <path d="M13.3 17.1l-2.3 2.3a3.4 3.4 0 0 1-4.8-4.8l2.3-2.3" />
    </Svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5.2" y="4.6" width="13.6" height="16.2" rx="2.2" />
      <path d="M9.2 4.6V3.4a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4v1.2" />
      <path d="M8.6 9h6.8M8.6 12.6h6.8M8.6 16.2h4.4" />
    </Svg>
  );
}