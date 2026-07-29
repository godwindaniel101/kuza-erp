import IconBase, { IconProps } from './IconBase';

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <circle cx="12" cy="7.5" r="1.6" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15h7" />
      <path d="M8.5 18h4" />
    </IconBase>
  );
}

export default MenuIcon;
