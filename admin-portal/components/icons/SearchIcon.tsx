import IconBase, { IconProps } from './IconBase';

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </IconBase>
  );
}

export default SearchIcon;
