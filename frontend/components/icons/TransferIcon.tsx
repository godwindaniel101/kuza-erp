import IconBase, { IconProps } from './IconBase';

export function TransferIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 9h14" />
      <path d="M15 6l3 3-3 3" />
      <path d="M20 15H6" />
      <path d="M9 12l-3 3 3 3" />
    </IconBase>
  );
}

export default TransferIcon;
