import { useState } from "react";
import { CreditTypeSelect } from "./CreditTypeSelect";
import { CreditType } from "@/types/credit";

/**
 * Example usage of CreditTypeSelect component
 * This file demonstrates how to use the component in forms
 */
export function CreditTypeSelectExample() {
  const [creditType, setCreditType] = useState<CreditType>("investment");
  const [isDisabled, setIsDisabled] = useState(false);

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Тип кредита
        </label>
        <CreditTypeSelect
          value={creditType}
          onValueChange={setCreditType}
          disabled={isDisabled}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Selected value: {creditType}
      </div>

      <button
        onClick={() => setIsDisabled(!isDisabled)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        Toggle Disabled State
      </button>
    </div>
  );
}
