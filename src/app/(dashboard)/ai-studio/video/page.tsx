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
import { ArrowLeft, Video, Download, Wand2 } from 'lucide-react';
import Link from 'next/link';
import type { VideoGenerationResult } from '@/types';

const STYLES = [
  { value: 'social-reel', label: 'Social Reel' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'text-motion', label: 'Text in Motion' },
  { value: 'interview',   label: 'Interview Style' },
];

const schema = z.object({
  campaignId:      z.string().min(1, 'Select a campaign'),
  generateScript:  z.boolean().default(false),
  topic:           z.string().max(200).optional(),
  campaignContext: z.string().max(500).optional(),
  script:          z.string().max(2000).optional(),
  duration:        z.coerce.number().refine((v) => v === 15 || v === 30, 'Must be 15 or 30').default(30),
  style:           z.string().min(1, 'Select a style'),
  subtitles:       z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

export default function VideoGeneratorPage() {
  const { campaigns, loading: campLoading } = useCampaigns();
  const { apiFetch }                        = useApi();
  const toast                               = useToast();
  const [generating, setGenerating]         = useState(false);
  const [result, setResult]                 = useState<VideoGenerationResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: { duration: 30, subtitles: true, generateScript: false },
  });

  const generateScript = watch('generateScript');

  if (campLoading) return <PageLoader />;

  async function onSubmit(data: FormValues) {
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiFetch<VideoGenerationResult>('/api/ai/video', {
        method: 'POST',
        body:   JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error);
      setResult(res.data);
      toast('success', 'Video generated and saved to storage!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/ai-studio" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> AI Studio
        </Link>
        <div className="flex items-start gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Video Generation</h2>
            <p className="text-stone-500 text-sm mt-0.5">
              Generate short-form social reels (15–30 sec) with script assistance via Claude + Pika Labs.
            </p>
          </div>
          <span className="mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">
            Phase 2
          </span>
        </div>
      </div>

      {/* Phase 2 notice */}
      <div className="card p-5 border-amber-200 bg-amber-50">
        <h3 className="font-semibold text-amber-900 text-sm mb-1">Phase 2 Feature</h3>
        <p className="text-xs text-amber-800">
          Video generation requires a Pika Labs API key. Set <code className="bg-amber-100 px-1 rounded">PIKA_API_KEY</code> in
          your environment to activate this feature. Script generation via Claude is available independently.
        </p>
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

        {/* Script mode */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-stone-50">
          <input
            type="checkbox"
            id="generateScript"
            {...register('generateScript')}
            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="generateScript" className="text-sm font-medium text-stone-700">
            Generate script with Claude AI
          </label>
        </div>

        {generateScript ? (
          <div className="space-y-4">
            <div>
              <label className="label block mb-1.5">Topic *</label>
              <input {...register('topic')} className="input-base" placeholder="What should the video be about?" />
            </div>
            <div>
              <label className="label block mb-1.5">Campaign Context</label>
              <textarea
                {...register('campaignContext')}
                rows={2}
                className="input-base resize-none"
                placeholder="Key facts, goals, and messaging to inform the script"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="label block mb-1.5">Video Script *</label>
            <textarea
              {...register('script')}
              rows={6}
              className="input-base resize-none font-mono text-xs"
              placeholder="Write your video script here. Include [PAUSE] markers for breathing room..."
            />
          </div>
        )}

        {/* Row: duration + style */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Duration</label>
            <select {...register('duration')} className="input-base">
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>
          <div>
            <label className="label block mb-1.5">Style *</label>
            <select {...register('style')} className="input-base">
              <option value="">Select style…</option>
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.style && <p className="text-xs text-red-500 mt-1">{errors.style.message}</p>}
          </div>
        </div>

        {/* Subtitles */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="subtitles"
            {...register('subtitles')}
            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="subtitles" className="text-sm text-stone-700">Include auto-generated subtitles</label>
        </div>

        <Button type="submit" loading={generating} icon={<Video className="h-4 w-4" />}>
          {generating ? 'Generating video…' : 'Generate Video'}
        </Button>
        <p className="text-xs text-stone-400">Video generation can take 2–5 minutes.</p>
      </form>

      {/* Result */}
      {result && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-stone-800">Generated Video</h3>
          <video
            src={result.storageUrl || result.videoUrl}
            controls
            className="rounded-xl w-full max-w-md bg-stone-900"
          />
          <div className="flex gap-3">
            <a
              href={result.storageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download MP4
            </a>
            <Button
              variant="secondary"
              onClick={() => handleSubmit(onSubmit)()}
              loading={generating}
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
