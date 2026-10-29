import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}

export function Logo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
  priority = false,
}: LogoProps) {
  const dimensions = {
    sm: { width: 28, height: 20, text: 'text-sm' },
    md: { width: 34, height: 24, text: 'text-base' },
    lg: { width: 44, height: 31, text: 'text-xl' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <Image
          src="/logo.png"
          alt="SubCaption Logo"
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          className="object-contain w-full h-full"
        />
      </div>
      {showText && (
        <span
          className={`font-bold tracking-tight text-white ${dimensions.text} ${textClassName}`}
        >
          SubCaption
        </span>
      )}
    </div>
  );
}

export default Logo;

