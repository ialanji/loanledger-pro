// Example usage of CreditTypeDisplay component
// This file demonstrates how to use the component in the Credits list

import { CreditTypeDisplay } from "./CreditTypeDisplay";

export function CreditTypeDisplayExample() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Investment Credit</h3>
        <CreditTypeDisplay creditType="investment" />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Working Capital Credit</h3>
        <CreditTypeDisplay creditType="working_capital" />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">In a table row context</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">Credit #12345</span>
          <CreditTypeDisplay creditType="investment" />
          <span className="text-sm text-muted-foreground">100,000 MDL</span>
        </div>
      </div>
    </div>
  );
}
