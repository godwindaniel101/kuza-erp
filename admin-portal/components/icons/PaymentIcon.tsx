import IconBase, { IconProps } from './IconBase';

export function PaymentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M6.5 14h3" />
    </IconBase>
  );
}

export default PaymentIcon;
