import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';

export function ThemeCompatibilityTest() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Theme Compatibility Test</h2>
        <p className="text-muted-foreground mb-6">
          Testing light/dark mode switching with both daisyUI and shadcn/ui components
        </p>
        
        {/* Theme Controls */}
        <div className="flex justify-center gap-4 mb-8">
          <Button 
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => setTheme('light')}
          >
            Light Mode
          </Button>
          <Button 
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => setTheme('dark')}
          >
            Dark Mode
          </Button>
          <Button 
            variant={theme === 'system' ? 'default' : 'outline'}
            onClick={() => setTheme('system')}
          >
            System
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Current theme: <span className="font-medium">{theme}</span>
        </div>
      </div>

      {/* Theme Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* shadcn/ui Components in Current Theme */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">shadcn/ui Components</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>Theme-Aware Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                This card automatically adapts to the current theme using CSS variables.
              </p>
              
              <div className="flex gap-2 flex-wrap">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">Muted background adapts to theme</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* daisyUI Components in Current Theme */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">daisyUI Components</h3>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Theme-Aware daisyUI Card</h2>
              <p className="text-base-content/70">
                daisyUI components also adapt to the theme through our configuration.
              </p>
              
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-accent">Accent</button>
                <button className="btn btn-ghost">Ghost</button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <div className="badge">Default</div>
                <div className="badge badge-primary">Primary</div>
                <div className="badge badge-secondary">Secondary</div>
                <div className="badge badge-accent">Accent</div>
              </div>
              
              <div className="alert">
                <span>daisyUI alert adapts to current theme</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mixed Theme Components */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Mixed Components Theme Test</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* shadcn/ui Card with daisyUI content */}
          <Card>
            <CardHeader>
              <CardTitle>shadcn/ui Card + daisyUI Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="stats shadow w-full">
                <div className="stat">
                  <div className="stat-title">Theme Test</div>
                  <div className="stat-value text-primary">100%</div>
                  <div className="stat-desc">Working correctly</div>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">daisyUI Input in shadcn/ui Card</span>
                </label>
                <input type="text" placeholder="Type here" className="input input-bordered w-full" />
              </div>
              
              <div className="flex gap-2">
                <button className="btn btn-sm btn-primary">daisyUI Button</button>
                <Button size="sm">shadcn/ui Button</Button>
              </div>
            </CardContent>
          </Card>

          {/* daisyUI Card with shadcn/ui content */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">daisyUI Card + shadcn/ui Content</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">shadcn/ui Muted Section</p>
                  <p className="text-xs text-muted-foreground">In daisyUI card</p>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge>shadcn/ui Badge</Badge>
                  <div className="badge badge-outline">daisyUI Badge</div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">shadcn/ui</Button>
                  <button className="btn btn-sm btn-outline">daisyUI</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Palette Test */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Color Palette Theme Test</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* shadcn/ui colors */}
          <div className="space-y-2">
            <div className="h-16 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-medium">Primary</span>
            </div>
            <p className="text-xs text-center">shadcn/ui</p>
          </div>
          
          <div className="space-y-2">
            <div className="h-16 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-secondary-foreground text-xs font-medium">Secondary</span>
            </div>
            <p className="text-xs text-center">shadcn/ui</p>
          </div>
          
          <div className="space-y-2">
            <div className="h-16 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground text-xs font-medium">Muted</span>
            </div>
            <p className="text-xs text-center">shadcn/ui</p>
          </div>
          
          {/* daisyUI colors */}
          <div className="space-y-2">
            <div className="h-16 bg-base-100 border rounded-lg flex items-center justify-center">
              <span className="text-base-content text-xs font-medium">Base 100</span>
            </div>
            <p className="text-xs text-center">daisyUI</p>
          </div>
          
          <div className="space-y-2">
            <div className="h-16 bg-base-200 rounded-lg flex items-center justify-center">
              <span className="text-base-content text-xs font-medium">Base 200</span>
            </div>
            <p className="text-xs text-center">daisyUI</p>
          </div>
          
          <div className="space-y-2">
            <div className="h-16 bg-base-300 rounded-lg flex items-center justify-center">
              <span className="text-base-content text-xs font-medium">Base 300</span>
            </div>
            <p className="text-xs text-center">daisyUI</p>
          </div>
        </div>
      </div>
    </div>
  );
}