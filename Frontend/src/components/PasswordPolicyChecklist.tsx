export function PasswordPolicyChecklist({
  hasMinLength,
  hasSpecialCharacter,
}: {
  hasMinLength: boolean;
  hasSpecialCharacter: boolean;
}) {
  const items = [
    { ok: hasMinLength, text: "At least 10 characters" },
    { ok: hasSpecialCharacter, text: "At least one special character" },
  ];

  return (
    <div className="mt-2 space-y-1 text-xs">
      {items.map((item) => (
        <div
          key={item.text}
          className={`flex items-center gap-2 ${item.ok ? "text-primary" : "text-muted-foreground"}`}
        >
          <span
            className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${
              item.ok ? "bg-primary text-primary-foreground" : "surface-3"
            }`}
            aria-hidden="true"
          >
            {item.ok ? "✓" : "·"}
          </span>
          {item.text}
        </div>
      ))}
    </div>
  );
}
