import Image from "next/image";
import Link from "next/link";

export function LogoLockup() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-3"
      aria-label="Lalica admin home"
    >
      <Image
        src="/brand/lalica-logo-white-background.jpg"
        alt=""
        width={132}
        height={49}
        className="h-auto w-32"
      />
    </Link>
  );
}
