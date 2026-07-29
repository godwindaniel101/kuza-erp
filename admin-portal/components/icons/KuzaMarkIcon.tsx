import IconBase, { IconProps } from './IconBase';

export function KuzaMarkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 18v-4" />
      <path d="M12 14c0-2.6 2.1-4.6 5.2-4.6C17.2 12 15.1 14 12 14Z" />
      <path d="M12 15c0-1.9-1.6-3.4-4.3-3.4C7.7 13.5 9.3 15 12 15Z" />
    </IconBase>
  );
}

export default KuzaMarkIcon;
