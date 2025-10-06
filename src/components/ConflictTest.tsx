import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ConflictTest() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold">Styling Conflict Detection</h2>
      
      {/* Button Conflicts Test */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Button Styling Conflicts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">shadcn/ui Buttons</h4>
            <div className="flex gap-2 flex-wrap">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">daisyUI Buttons</h4>
            <div className="flex gap-2 flex-wrap">
              <button className="btn">Default</button>
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-outline">Outline</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-error">Error</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-sm">Small</button>
              <button className="btn btn-md">Medium</button>
              <button className="btn btn-lg">Large</button>
            </div>
          </div>
        </div>
      </section>

      {/* Input Conflicts Test */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Input Styling Conflicts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">shadcn/ui Inputs</h4>
            <Input placeholder="shadcn/ui input" />
            <Input placeholder="With error state" className="border-destructive" />
            <Input placeholder="Disabled input" disabled />
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">daisyUI Inputs</h4>
            <input type="text" placeholder="daisyUI input" className="input input-bordered w-full" />
            <input type="text" placeholder="Error state" className="input input-bordered input-error w-full" />
            <input type="text" placeholder="Disabled input" className="input input-bordered w-full" disabled />
          </div>
        </div>
      </section>

      {/* Card Conflicts Test */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Card Styling Conflicts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>shadcn/ui Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This is a shadcn/ui card component.</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Action</Button>
                <Button size="sm" variant="outline">Cancel</Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">daisyUI Card</h2>
              <p>This is a daisyUI card component.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary btn-sm">Action</button>
                <button className="btn btn-outline btn-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mixed Usage Edge Cases */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Mixed Usage Edge Cases</h3>
        
        {/* Test: daisyUI classes on shadcn/ui components */}
        <div className="space-y-4">
          <h4 className="font-medium">Potential Conflicts</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="text-sm font-medium">shadcn/ui Button with daisyUI classes (should be avoided)</h5>
              <div className="p-4 bg-muted rounded-lg">
                <Button className="btn-primary">Mixed classes (not recommended)</Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This might cause conflicts - use either shadcn/ui OR daisyUI classes
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h5 className="text-sm font-medium">Proper separation</h5>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex gap-2">
                  <Button>shadcn/ui</Button>
                  <button className="btn btn-primary">daisyUI</button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: Use components separately
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Specificity Test */}
        <div className="space-y-4">
          <h4 className="font-medium">CSS Specificity Test</h4>
          <div className="p-4 border rounded-lg space-y-4">
            <p className="text-sm text-muted-foreground">
              Testing if daisyUI styles override shadcn/ui styles or vice versa
            </p>
            
            <div className="flex gap-4 flex-wrap">
              <button className="btn">Pure daisyUI</button>
              <Button>Pure shadcn/ui</Button>
              <button className="btn bg-primary text-primary-foreground">daisyUI + shadcn/ui colors</button>
            </div>
          </div>
        </div>
      </section>

      {/* Resolution Guidelines */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Conflict Resolution Guidelines</h3>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200">✅ Best Practices</h4>
            <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
              <li>• Use shadcn/ui components for form elements and complex UI</li>
              <li>• Use daisyUI for quick prototyping and utility components</li>
              <li>• Don't mix component classes (e.g., don't add 'btn' class to Button component)</li>
              <li>• Prefer one library per component type in production</li>
            </ul>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">⚠️ Potential Issues</h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
              <li>• CSS specificity conflicts when mixing classes</li>
              <li>• Inconsistent spacing and sizing between libraries</li>
              <li>• Theme variables may not align perfectly</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}