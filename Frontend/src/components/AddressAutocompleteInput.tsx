import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { AddressSuggestion, searchAddressSuggestions } from "@/lib/geo";

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder,
  required,
  maxLength = 240,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (!open || query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchAddressSuggestions(query)
        .then((items) => {
          if (!cancelled) setSuggestions(items);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, value]);

  const handleFocus = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleBlur = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.label);
    setOpen(false);
    setSuggestions([]);
  };

  const showPanel = open && (loading || suggestions.length > 0 || value.trim().length >= 3);

  return (
    <div className="relative">
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[1300] overflow-hidden rounded-md bg-popover text-popover-foreground shadow-lg ring-1 ring-border">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching OpenStreetMap...</div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No address suggestions found.
            </div>
          )}

          {!loading && suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(suggestion)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 leading-snug">{suggestion.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
