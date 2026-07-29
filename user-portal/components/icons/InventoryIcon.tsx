import IconBase, { IconProps } from './IconBase';

export function InventoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4" />
      <path d="M12 11v10" />
    </IconBase>
  );
}

export default InventoryIcon;
