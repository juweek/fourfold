export function PillSelector<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="pill-selector" role="group" aria-label={label}>
      {options.map((option) => (
        <button type="button" className={value === option.value ? "selected" : ""} aria-pressed={value === option.value} onClick={() => onChange(option.value)} key={option.value}>
          {option.icon}{option.label}
        </button>
      ))}
    </div>
  );
}
