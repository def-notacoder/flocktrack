import Input, { type InputProps } from "@mui/joy/Input";

type DateInputProps = Omit<InputProps, "type"> & {
  type?: "date" | "datetime-local";
};

/** Native date/datetime input that dismisses the picker after a value is chosen. */
export function DateInput({ onChange, type = "date", ...props }: DateInputProps) {
  return (
    <Input
      type={type}
      {...props}
      onChange={(e) => {
        onChange?.(e);
        e.target.blur();
      }}
    />
  );
}
