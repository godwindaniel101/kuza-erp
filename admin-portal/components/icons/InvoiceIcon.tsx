import IconBase, { IconProps } from './IconBase';

export function InvoiceIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2Z" />
      <path d="M9 8h6" />
      <path d="M9 11h6" />
      <path d="M9 14h3" />
    </IconBase>
  );
}

export default InvoiceIcon;
