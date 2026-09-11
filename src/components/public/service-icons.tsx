/**
 * Original line icons for the three service groups and UI accents.
 * Drawn as inline SVG paths; no icon library dependency.
 */

interface IconProps {
  className?: string;
}

function Svg({
  className,
  children,
  title,
}: IconProps & { children: React.ReactNode; title: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
    >
      {children}
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Electrical and automation">
      <path d="M27 5 10 27h12l-3 16 17-22H24l3-16z" />
    </Svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Mechanical engineering">
      <circle cx="19" cy="19" r="7" />
      <circle cx="31" cy="31" r="4.5" />
      <path d="M34 14a5.5 5.5 0 0 1 5.5 5.5" />
    </Svg>
  );
}

export function SnowflakeIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Refrigeration and HVAC">
      <path d="M24 5v38M24 12l7-7M24 12 17 5M24 36l7 7M24 36l-7 7" />
      <path d="m8.5 15.5 31 17M12.5 11.5 9 21m3.5-9.5L22 15M35.5 36.5 39 27m-3.5 9.5L26 33" />
      <path d="m39.5 15.5-31 17M35.5 11.5 39 21m-3.5-9.5L26 15M12.5 36.5 9 27m3.5 9.5L22 33" />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="6" r="2.6" />
      <circle cx="18" cy="18" r="2.6" />
      <path d="m8.4 10.8 7.2-3.6M8.4 13.2l7.2 3.6" />
    </svg>
  );
}
