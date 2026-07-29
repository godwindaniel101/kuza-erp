import IconBase, { IconProps } from './IconBase';

export function FilterIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h16l-6 7v5l-4 2v-7Z" />
    </IconBase>
  );
}

export default FilterIcon;
