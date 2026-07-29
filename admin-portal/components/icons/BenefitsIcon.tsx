import IconBase, { IconProps } from './IconBase';

export function BenefitsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 13h14v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z" />
      <rect x="3.5" y="9" width="17" height="4" rx="1" />
      <path d="M12 9v11" />
      <path d="M12 9C11 6 7 6 7 8.4 7 9 9.5 9 12 9Z" />
      <path d="M12 9C13 6 17 6 17 8.4 17 9 14.5 9 12 9Z" />
    </IconBase>
  );
}

export default BenefitsIcon;
