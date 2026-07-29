import IconBase, { IconProps } from './IconBase';

export function AdjustmentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8h9" />
      <path d="M18 8h2" />
      <circle cx="15.5" cy="8" r="2.3" />
      <path d="M4 16h4" />
      <path d="M13 16h7" />
      <circle cx="10.5" cy="16" r="2.3" />
    </IconBase>
  );
}

export default AdjustmentIcon;
