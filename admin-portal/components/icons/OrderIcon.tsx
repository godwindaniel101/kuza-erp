import IconBase, { IconProps } from './IconBase';

export function OrderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2l2.3 11.1a1.5 1.5 0 0 0 1.47 1.2h7.4a1.5 1.5 0 0 0 1.47-1.18L20 8.5H6" />
    </IconBase>
  );
}

export default OrderIcon;
