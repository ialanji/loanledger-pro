import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function CompatibilityTest() {
  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold">Component Compatibility Test</h2>
      
      {/* Side by side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* shadcn/ui components */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">shadcn/ui Components</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>shadcn/ui Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="shadcn/ui Input" />
              <div className="flex gap-2">
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
              </div>
              <div className="flex gap-2">
                <Badge>Default Badge</Badge>
                <Badge variant="secondary">Secondary Badge</Badge>
                <Badge variant="destructive">Destructive Badge</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* daisyUI components */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">daisyUI Components</h3>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">daisyUI Card</h2>
              <div className="space-y-4">
                <input type="text" placeholder="daisyUI Input" className="input input-bordered w-full" />
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-primary">Primary Button</button>
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-outline">Outline</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="badge">Default Badge</div>
                  <div className="badge badge-secondary">Secondary Badge</div>
                  <div className="badge badge-error">Error Badge</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mixed usage test */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Mixed Usage Test</h3>
        
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui Card with daisyUI Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button>shadcn/ui Button</Button>
              <button className="btn btn-primary">daisyUI Button</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="shadcn/ui Input" />
              <input type="text" placeholder="daisyUI Input" className="input input-bordered" />
            </div>
            
            <div className="alert alert-info">
              <span>daisyUI alert inside shadcn/ui card works properly</span>
            </div>
          </CardContent>
        </Card>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">daisyUI Card with shadcn/ui Components</h2>
            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <button className="btn btn-primary">daisyUI Button</button>
                <Button>shadcn/ui Button</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="daisyUI Input" className="input input-bordered" />
                <Input placeholder="shadcn/ui Input" />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge>shadcn/ui Badge</Badge>
                <div className="badge badge-primary">daisyUI Badge</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive test */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Responsive Behavior Test</h3>
        <p className="text-sm text-gray-600">Resize your browser window to test responsive behavior</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card bg-base-100 shadow-md">
              <div className="card-body p-4">
                <h4 className="card-title text-sm">Card {i}</h4>
                <p className="text-xs">Responsive grid item</p>
                <div className="card-actions justify-end">
                  <Button size="sm" className="text-xs">shadcn/ui</Button>
                  <button className="btn btn-xs btn-primary">daisyUI</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}