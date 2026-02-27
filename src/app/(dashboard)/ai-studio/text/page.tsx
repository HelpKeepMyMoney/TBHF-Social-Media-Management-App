'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  Copy,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import type { TextGenerationResult, TextGenerationRequest } from '@/types';

const CONTENT_TYPES = [
  { value: 'social-post',          label: 'Social Post' },
  { value: 'newsletter',           label: 'Newsletter' },
  { value: 'event-announcement',   label: 'Event Announcement' },
  { value: 'fundraising-appeal',   label: 'Fundraising Appeal' },
  { value: 'impact-story',         label: 'Impact Story' },
  { value: 'volunteer-recruitment', label: 'Volunteer Recruitment' },
];

const TONES = [
  { value: 'inspirational',  label: 'Inspirational' },
  { value: 'urgent',         label: 'Urgent' },
  { value: 'informative',    label: 'Informative' },
  { value: 'celebratory',    label: 'Celebratory' },
  { value: 'conversational', label: 'Conversational' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'twitter',   label: 'X / Twitter' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'tiktok',    label: 'TikTok' },
];

const schema = z.object({
  campaignId:        z.string().min(1, 'Select a campaign'),
  topic:             z.string().min(3, 'Describe the topic'),
  contentType:       z.string().min(1, 'Select content type'),
  tone:              z.string().min(1, 'Select tone'),
  platform:          z.string().min(1, 'Select platform'),
  wordLimit:         z.coerce.number().min(10).max(1000).default(100),
  additionalContext: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TextGeneratorPage() {
  const { campaigns, loading: campLoading } = useCampaigns();
  const { apiFetch }                        = useApi();
  const toast                               = useToast();
  const [generating, setGenerating]         = useState(false);
  const [result, setResult]                 = useState<TextGenerationResult | null>(null);
  const [showLong, setShowLong]             = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { wordLimit: 100 } });

  if (campLoading) return <PageLoader />;

  async function onSubmit(data: FormValues) {
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiFetch<TextGenerationResult>('/api/ai/text', {
        method: 'POST',
        body:   JSON.stringify(data as TextGenerationRequest),
      });
      if (!res.success) throw new Error(res.error);
      setResult(res.data);
      toast('success', 'Content generated successfully!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast('info', `${label} copied to clipboard`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/ai-studio" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> AI Studio
        </Link>
        <h2 className="text-xl font-bold text-stone-900">Text Generation</h2>
        <p className="text-stone-500 text-sm mt-0.5">Claude generates tailored content for your campaign and platform.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        {/* Campaign */}
        <div>
          <label className="label block mb-1.5">Campaign *</label>
          <select {...register('campaignId')} className="input-base">
            <option value="">Select a campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.campaignId && <p className="text-xs text-red-500 mt-1">{errors.campaignId.message}</p>}
        </div>

        {/* Topic */}
        <div>
          <label className="label block mb-1.5">Topic *</label>
          <input
            {...register('topic')}
            className="input-base"
            placeholder="e.g. 'Winter coat drive for families in need'"
          />
          {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic.message}</p>}
        </div>

        {/* Row: content type + tone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Content Type *</label>
            <select {...register('contentType')} className="input-base">
              <option value="">Select type…</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.contentType && <p className="text-xs text-red-500 mt-1">{errors.contentType.message}</p>}
          </div>
          <div>
            <label className="label block mb-1.5">Tone *</label>
            <select {...register('tone')} className="input-base">
              <option value="">Select tone…</option>
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.tone && <p className="text-xs text-red-500 mt-1">{errors.tone.message}</p>}
          </div>
        </div>

        {/* Row: platform + word limit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Target Platform *</label>
            <select {...register('platform')} className="input-base">
              <option value="">Select platform…</option>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {errors.platform && <p className="text-xs text-red-500 mt-1">{errors.platform.message}</p>}
          </div>
          <div>
            <label className="label block mb-1.5">Word Limit</label>
            <input type="number" min="10" max="1000" step="10" {...register('wordLimit')} className="input-base" />
          </div>
        </div>

        {/* Additional context */}
        <div>
          <label className="label block mb-1.5">Additional Context <span className="text-stone-400 font-normal">(optional)</span></label>
          <textarea
            {...register('additionalContext')}
            rows={2}
            className="input-base resize-none"
            placeholder="Any specific facts, names, dates, or messaging guidance"
          />
        </div>

        <Button type="submit" loading={generating} icon={<RefreshCw className="h-4 w-4" />}>
          {generating ? 'Generating…' : 'Generate Content'}
        </Button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Caption */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-800">Caption</h3>
              <button
                onClick={() => copyToClipboard(result.caption, 'Caption')}
                className="btn-ghost text-xs gap-1.5 py-1"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{result.caption}</p>
          </div>

          {/* Short version */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-800">Short Version</h3>
              <button
                onClick={() => copyToClipboard(result.shortVersion, 'Short version')}
                className="btn-ghost text-xs gap-1.5 py-1"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <p className="text-stone-700 text-sm">{result.shortVersion}</p>
          </div>

          {/* Long version (collapsible) */}
          <div className="card p-5">
            <button
              onClick={() => setShowLong(!showLong)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="font-semibold text-stone-800">Long Version</h3>
              {showLong ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </button>
            {showLong && (
              <div className="mt-3">
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{result.longVersion}</p>
                <button
                  onClick={() => copyToClipboard(result.longVersion, 'Long version')}
                  className="btn-ghost text-xs gap-1.5 py-1 mt-2"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="card p-5">
            <h3 className="font-semibold text-stone-800 mb-3">CTA Suggestions</h3>
            <ul className="space-y-1.5">
              {result.ctaSuggestions.map((cta, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-stone-700">→ {cta}</span>
                  <button onClick={() => copyToClipboard(cta, 'CTA')} className="btn-ghost text-xs gap-1 py-0.5">
                    <Copy className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Hashtags */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-800">Hashtags</h3>
              <button
                onClick={() => copyToClipboard(result.hashtags.join(' '), 'Hashtags')}
                className="btn-ghost text-xs gap-1.5 py-1"
              >
                <Copy className="h-3.5 w-3.5" /> Copy all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.hashtags.map((tag, i) => (
                <span key={i} className="text-sm text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>

          {/* Send to post */}
          <div className="flex gap-3">
            <Link
              href={`/posts/new?caption=${encodeURIComponent(result.caption)}`}
              className="btn-primary text-sm"
            >
              <Send className="h-4 w-4" /> Send to Post Scheduler
            </Link>
            <Button
              variant="secondary"
              onClick={() => handleSubmit(onSubmit)()}
              loading={generating}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
