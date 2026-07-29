import IconBase, { IconProps } from './IconBase';

export function ChevronIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5l7 7-7 7" />
    </IconBase>
  );
}

export default ChevronIcon;
