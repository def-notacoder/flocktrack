import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";

/** Simple chicken silhouette — matches favicon style for the Birds nav tab. */
export function ChickenIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <ellipse cx="12" cy="16" rx="7.5" ry="5.5" />
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M9.5 4.2 10.2 2.4 11.4 4.1 12 2.2l.6 1.9 1.2-1.7.7 1.8c-.6.2-1.2.5-1.8.7" />
      <path d="M16.5 8.5 21 7 17.5 10.5Z" />
      <path d="M5.5 15.8 3.2 12.5 6.8 13.8Z" />
    </SvgIcon>
  );
}
