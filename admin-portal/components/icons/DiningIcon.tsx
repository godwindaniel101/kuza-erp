import IconBase, { IconProps } from './IconBase';

export function DiningIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export default DiningIcon;
