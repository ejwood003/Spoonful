import Image from "next/image";
import Link from "next/link";

export function BrandMark({
  href = "/",
  current = false,
}: {
  href?: string;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Spoonful, home"
      aria-current={current ? "page" : undefined}
      className="ds-mark"
    >
      <span className="ds-mark-icon">
        <Image
          src="/spoonful-icon.png"
          alt=""
          width={36}
          height={36}
          className="ds-mark-icon-img"
          priority
        />
      </span>
      <span className="ds-mark-word">Spoonful</span>
    </Link>
  );
}
