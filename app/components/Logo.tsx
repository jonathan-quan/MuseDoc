/**
 * MuseDoc brand mark — the quill-and-spark logo.
 *
 * The artwork is a single dark-navy color, so (unlike an icon font) it can't be
 * recolored with CSS. We ship a light variant and swap the two PNGs by theme so
 * the mark stays legible on both light and dark surfaces. `className` controls
 * the box size (e.g. "h-6 w-6").
 */
export default function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="MuseDoc"
        className={`${className} object-contain dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-light.png"
        alt=""
        aria-hidden="true"
        className={`${className} hidden object-contain dark:block`}
      />
    </>
  );
}
