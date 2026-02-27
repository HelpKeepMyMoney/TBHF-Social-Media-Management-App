'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Download, RefreshCw, Send, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { ImageGenerationResult } from '@/types';

const VISUAL_TYPES = [
  { value: 'quote-card',        label: 'Quote Card' },
  { value: 'event-promo',       label: 'Event Promo' },
  { value: 'awareness-graphic', label: 'Awareness Graphic' },
  { value: 'donation-appeal',   label: 'Donation Appeal' },
  { value: 'impact-stat',       label: 'Impact Stat' },
];

const STYLES = [
  { value: 'photorealistic',   label: 'Photorealistic' },
  { value: 'illustrated',      label: 'Illustrated' },
  { value: 'minimal',          label: 'Minimal' },
  { value: 'bold-typography',  label: 'Bold Typography' },
  { value: 'watercolor',       label: 'Watercolor' },
];

const DIMENSIONS = [
  { value: '1:1',  label: 'Square (1:1) — Instagram Feed' },
  { value: '4:5',  label: 'Portrait (4:5) — Instagram/Facebook' },
  { value: '16:9', label: 'Landscape (16:9) — Facebook/LinkedIn' },
  { value: '9:16', label: 'Vertical (9:16) — Stories/Reels' },
];

const schema = z.object({
  campaignId:        z.string().min(1, 'Select a campaign'),
  visualType:        z.string().min(1, 'Select visual type'),
  style:             z.string().min(1, 'Select a style'),
  dimensions:        z.string().min(1, 'Select dimensions'),
  prompt:            z.string().min(5, 'Describe what you want to see'),
  additionalContext: z.string().max(300).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ImageGeneratorPage() {
  const { campaigns, loading: campLoading } = useCampaigns();
  const { apiFetch }                        = useApi();
  const toast                               = useToast();
  const [generating, setGenerating]         = useState(false);
  const [result, setResult]                 = useState<ImageGenerationResult | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (campLoading) return <PageLoader />;

  async function onSubmit(data: FormValues) {
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiFetch<ImageGenerationResult>('/api/ai/image', {
        method: 'POST',
        body:   JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error);
      setResult(res.data);
      toast('success', 'Image generated and saved to storage!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate() {
    await handleSubmit(onSubmit)();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/ai-studio" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> AI Studio
        </Link>
        <h2 className="text-xl font-bold text-stone-900">Image Generation</h2>
        <p className="text-stone-500 text-sm mt-0.5">
          DALL-E 3 generates images, which are automatically saved to your media storage.
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

        {/* Row: visual type + style */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Visual Type *</label>
            <select {...register('visualType')} className="input-base">
              <option value="">Select type…</option>
              {VISUAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.visualType && <p className="text-xs text-red-500 mt-1">{errors.visualType.message}</p>}
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

        {/* Dimensions */}
        <div>
          <label className="label block mb-1.5">Dimensions *</label>
          <select {...register('dimensions')} className="input-base">
            <option value="">Select dimensions…</option>
            {DIMENSIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          {errors.dimensions && <p className="text-xs text-red-500 mt-1">{errors.dimensions.message}</p>}
        </div>

        {/* Prompt */}
        <div>
          <label className="label block mb-1.5">Image Description *</label>
          <textarea
            {...register('prompt')}
            rows={3}
            className="input-base resize-none"
            placeholder="Describe the image you want. Be specific about subjects, mood, colors, and composition."
          />
          {errors.prompt && <p className="text-xs text-red-500 mt-1">{errors.prompt.message}</p>}
        </div>

        {/* Additional context */}
        <div>
          <label className="label block mb-1.5">Additional Context <span className="text-stone-400 font-normal">(optional)</span></label>
          <input
            {...register('additionalContext')}
            className="input-base"
            placeholder="Campaign theme, brand colors, specific elements to include or avoid"
          />
        </div>

        <Button type="submit" loading={generating} icon={<ImageIcon className="h-4 w-4" />}>
          {generating ? 'Generating image…' : 'Generate Image'}
        </Button>

        <p className="text-xs text-stone-400">
          Generation takes 15–30 seconds. Images are automatically uploaded to your storage provider.
        </p>
      </form>

      {/* Result */}
      {result && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-stone-800">Generated Image</h3>

          <div className="relative rounded-xl overflow-hidden bg-stone-100 aspect-square max-w-md">
            <Image
              src={result.storageUrl || result.imageUrl}
              alt="AI generated image"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 448px"
            />
          </div>

          {result.revisedPrompt && (
            <div className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3">
              <strong>Revised prompt:</strong> {result.revisedPrompt}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <a
              href={result.storageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            <Link
              href={`/posts/new?mediaUrl=${encodeURIComponent(result.storageUrl)}&mediaType=image`}
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" /> Attach to Post
            </Link>
            <Button
              variant="ghost"
              onClick={regenerate}
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
