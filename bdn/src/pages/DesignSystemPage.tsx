import React, { useState } from 'react';
import { Layers, CheckCircle2, AlertCircle, Sparkles, Play } from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card';
import { Badge } from '../components/Badge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export const DesignSystemPage: React.FC = () => {
  const [btnLoading, setBtnLoading] = useState(false);

  const toggleLoading = () => {
    setBtnLoading(true);
    setTimeout(() => setBtnLoading(false), 2000);
  };

  return (
    <div className="space-y-12 pb-20">
      <SectionHeader
        title="Netflix Cinematic Visual System Primitives"
        subtitle="Dark high-contrast component architecture, iconic red accents, and responsive layout primitives"
        badge={<Badge variant="primary" className="bg-red-600 text-white font-bold">Netflix Dark Theme</Badge>}
      />

      {/* 1. Color Palette System */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> 1. Global Color Tokens
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 shadow-lg">
            <div className="h-10 bg-[#141414] rounded border border-neutral-800"></div>
            <div>
              <span className="text-xs font-semibold text-white block">Main Netflix Dark</span>
              <span className="text-[10px] text-neutral-400 font-mono">#141414</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 shadow-lg">
            <div className="h-10 bg-[#1f1f1f] rounded border border-neutral-800"></div>
            <div>
              <span className="text-xs font-semibold text-white block">Card Surface</span>
              <span className="text-[10px] text-neutral-400 font-mono">#1f1f1f</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 shadow-lg">
            <div className="h-10 bg-[#E50914] rounded"></div>
            <div>
              <span className="text-xs font-semibold text-white block">Netflix Red</span>
              <span className="text-[10px] text-neutral-400 font-mono">#E50914</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 shadow-lg">
            <div className="h-10 bg-[#b9090b] rounded"></div>
            <div>
              <span className="text-xs font-semibold text-white block">Hover Deep Red</span>
              <span className="text-[10px] text-neutral-400 font-mono">#b9090b</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 shadow-lg">
            <div className="h-10 bg-amber-500 rounded"></div>
            <div>
              <span className="text-xs font-semibold text-white block">Star Gold</span>
              <span className="text-[10px] text-neutral-400 font-mono">#f59e0b</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 shadow-lg">
            <div className="h-10 bg-neutral-800 rounded border border-neutral-700"></div>
            <div>
              <span className="text-xs font-semibold text-white block">Border Neutral</span>
              <span className="text-[10px] text-neutral-400 font-mono">#2f2f2f</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Button Component */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> 2. Button Component (<code className="text-xs text-red-400 font-mono">Button.tsx</code>)
        </h3>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-6 shadow-xl">
          <div className="space-y-2">
            <span className="text-xs text-neutral-400 font-mono uppercase block">Variants (Hover for brighter state)</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={<Play className="w-4 h-4 fill-white" />}>Netflix Red Primary</Button>
              <Button variant="secondary">Dark Secondary</Button>
              <Button variant="outline">Outline Action</Button>
              <Button variant="ghost">Ghost Action</Button>
              <Button variant="danger">Danger Action</Button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-neutral-800">
            <span className="text-xs text-neutral-400 font-mono uppercase block">Sizes & States</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">Small (sm)</Button>
              <Button variant="primary" size="md">Medium (md)</Button>
              <Button variant="primary" size="lg">Large (lg)</Button>
              <Button variant="primary" isLoading={btnLoading} onClick={toggleLoading}>
                {btnLoading ? 'Processing...' : 'Test Red Hover & Click'}
              </Button>
              <Button variant="primary" disabled>Disabled State</Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Badge Component */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> 3. Badge Component (<code className="text-xs text-red-400 font-mono">Badge.tsx</code>)
        </h3>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4 shadow-xl">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary" className="bg-red-600 text-white font-bold">Primary (PG-13)</Badge>
            <Badge variant="gold" icon={<Sparkles className="w-3 h-3" />}>Gold Rating 9.2</Badge>
            <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Seat Available</Badge>
            <Badge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>Low Stock</Badge>
            <Badge variant="error">Sold Out</Badge>
            <Badge variant="neutral">IMAX 3D</Badge>
            <Badge variant="outline">Standard 2D</Badge>
          </div>
        </div>
      </section>

      {/* 4. Card Component */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> 4. Card Primitive Component (<code className="text-xs text-red-400 font-mono">Card.tsx</code>)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <Badge variant="neutral" size="sm" className="w-fit">Standard Card</Badge>
              <CardTitle>Auditorium Seat Lock Policy</CardTitle>
              <CardDescription>
                When a seat is selected, an atomic 10-minute hold is generated in Redis/PostgreSQL.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-neutral-300">
                Prevents double-booking across concurrent browser sessions during high-volume ticket drops.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-xs font-mono text-neutral-500">Timeout: 600s</span>
              <Button variant="secondary" size="sm">Details</Button>
            </CardFooter>
          </Card>

          <Card interactive className="bg-neutral-900 border-neutral-800 hover:border-red-600/50">
            <CardHeader>
              <Badge variant="gold" size="sm" className="w-fit">Interactive Hover Card</Badge>
              <CardTitle>Interactive Seat Map Integration</CardTitle>
              <CardDescription>
                Card responds with subtle red border highlight and scale transition.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-neutral-300">
                Hover over this component to evaluate dark card design and Netflix hover states.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-xs font-mono text-red-400 font-medium">Status: Active</span>
              <Button variant="primary" size="sm">Select</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 5. Feedback States (Loading, Error, Empty) */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> 5. Asynchronous Feedback States
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-lg">
            <span className="text-xs font-mono text-neutral-400 block mb-2 text-center">LoadingState.tsx</span>
            <LoadingState message="Connecting to API..." subtitle="Standardized spinner state" />
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-lg">
            <span className="text-xs font-mono text-neutral-400 block mb-2 text-center">ErrorState.tsx</span>
            <ErrorState
              title="Connection Timeout"
              message="Backend server did not respond."
              code={504}
              onRetry={() => alert('Retry triggered')}
            />
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-lg">
            <span className="text-xs font-mono text-neutral-400 block mb-2 text-center">EmptyState.tsx</span>
            <EmptyState
              title="No Seats Reserved"
              description="Your cart is currently empty."
              actionLabel="Browse Movies"
              onAction={() => alert('Navigate to movies')}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
