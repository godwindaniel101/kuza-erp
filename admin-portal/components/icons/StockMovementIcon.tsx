import IconBase, { IconProps } from './IconBase';

export function StockMovementIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 20V5" />
      <path d="M3.5 8.5 7 5l3.5 3.5" />
      <path d="M17 4v15" />
      <path d="M20.5 15.5 17 19l-3.5-3.5" />
    </IconBase>
  );
}

export default StockMovementIcon;
