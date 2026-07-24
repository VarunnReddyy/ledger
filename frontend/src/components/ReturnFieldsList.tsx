import type { ReturnFieldOut, ReturnSectionOut } from "@/lib/types";
import { FieldValue } from "@/components/FieldValue";

interface ReturnFieldsListProps {
  sections: ReturnSectionOut[];
  selectedFieldId?: string;
  onSelectField: (field: ReturnFieldOut) => void;
}

export function ReturnFieldsList({
  sections,
  selectedFieldId,
  onSelectField,
}: ReturnFieldsListProps) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} aria-label={section.label} className="space-y-2">
          <h2 className="type-section">{section.label}</h2>
          <div className="divide-y divide-rule border-t border-rule">
            {section.fields.map((field) => (
              <FieldValue
                key={field.id}
                label={field.label}
                lineRef={field.line_ref}
                value={field.value}
                state={field.state}
                lockedReason={field.locked_reason}
                selected={field.id === selectedFieldId}
                onSelect={() => onSelectField(field)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
