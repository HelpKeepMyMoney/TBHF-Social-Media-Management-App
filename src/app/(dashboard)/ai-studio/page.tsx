import Link from 'next/link';
import { Wand2, Image as ImageIcon, Video, ArrowRight } from 'lucide-react';

const tools = [
  {
    href:        '/ai-studio/text',
    icon:        <Wand2  className="h-6 w-6" />,
    label:       'Text Generation',
    description: 'Generate captions, CTAs, and hashtags using Claude AI. Tuned for your campaign voice.',
    badge:       null,
    color:       'bg-amber-50 text-amber-700',
  },
  {
    href:        '/ai-studio/image',
    icon:        <ImageIcon className="h-6 w-6" />,
    label:       'Image Generation',
    description: 'Create on-brand graphics, quote cards, and promotional artwork with DALL-E 3.',
    badge:       null,
    color:       'bg-orange-50 text-orange-700',
  },
  {
    href:        '/ai-studio/video',
    icon:        <Video  className="h-6 w-6" />,
    label:       'Video Generation',
    description: 'Generate short-form social reels (15–30 sec) with AI-written scripts via Pika Labs.',
    badge:       'Phase 2',
    color:       'bg-stone-100 text-stone-500',
  },
];

export default function AIStudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">AI Studio</h2>
        <p className="text-stone-500 text-sm mt-0.5">
          AI is a controlled productivity tool — you review and approve everything before it goes live.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <div className="card hover:shadow-card-hover transition-shadow cursor-pointer h-full">
              <div className={`inline-flex p-3 rounded-xl mb-4 ${tool.color}`}>
                {tool.icon}
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-stone-900">{tool.label}</h3>
                {tool.badge && (
                  <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                    {tool.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">{tool.description}</p>
              <div className="flex items-center text-brand-600 text-xs font-medium mt-4 gap-1">
                Open tool <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-5 bg-amber-50 border-amber-200">
        <h3 className="font-semibold text-amber-900 text-sm mb-1">AI Content Policy</h3>
        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li>All AI-generated content must be reviewed before scheduling</li>
          <li>Do not publish AI content without editing and approving it</li>
          <li>Verify statistics and claims — AI can hallucinate facts</li>
          <li>Keep your organization&apos;s brand voice by editing outputs before use</li>
          <li>All generations are logged for accountability</li>
        </ul>
      </div>
    </div>
  );
}
