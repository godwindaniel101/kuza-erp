import IconBase, { IconProps } from './IconBase';

export function BranchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 10v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8" />
      <rect x="3" y="6.5" width="18" height="3.5" rx="1" />
      <path d="M7.5 6.5v3.5" />
      <path d="M12 6.5v3.5" />
      <path d="M16.5 6.5v3.5" />
      <path d="M9 19v-3.5a1.5 1.5 0 0 1 3 0V19" />
      <rect x="14" y="14" width="3.2" height="3.2" rx="0.6" />
    </IconBase>
  );
}

export default BranchIcon;
