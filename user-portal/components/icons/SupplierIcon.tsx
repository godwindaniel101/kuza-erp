import IconBase, { IconProps } from './IconBase';

export function SupplierIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="6.5" width="11" height="8.5" rx="1.5" />
      <path d="M13.5 9.5h3.4l2.6 2.8v2.7h-6" />
      <circle cx="7" cy="17.5" r="1.7" />
      <circle cx="16.5" cy="17.5" r="1.7" />
      <path d="M9 17.5h5.5" />
    </IconBase>
  );
}

export default SupplierIcon;
