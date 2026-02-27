'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useCampaigns } from '@/hooks/useCampaigns';
import { usePosts } from '@/hooks/usePosts';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import type { PostFormData } from '@/types';

const schema = z.object({
  campaignId:    z.string().min(1, 'Select a campaign'),
  caption:       z.string().min(1, 'Caption is required').max(3000),
  platform:      z.string().min(1, 'Select a platform'),
  mediaUrl:      z.string().url().optional().or(z.literal('')),
  mediaType:     z.enum(['image', 'video', 'none']).default('none'),
  status:        z.enum(['draft', 'scheduled', 'posted']).default('draft'),
  scheduledTime: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'twitter',   label: 'X / Twitter' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'tiktok',    label: 'TikTok' },
];

export default function NewPostPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { campaigns } = useCampaigns();
  const { createPost } = usePosts();
  const toast         = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Pre-fill from AI Studio query params
  const initialCaption  = searchParams.get('caption')  ?? '';
  const initialMediaUrl = searchParams.get('mediaUrl') ?? '';
  const initialMediaType = searchParams.get('mediaType') ?? 'none';
  const initialCampaignId = searchParams.get('campaignId') ?? '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: {
      caption:    initialCaption,
      mediaUrl:   initialMediaUrl,
      mediaType:  (initialMediaType as 'image' | 'video' | 'none') || 'none',
      campaignId: initialCampaignId,
      status:     'draft',
    },
  });

  const status   = watch('status');
  const mediaUrl = watch('mediaUrl');

  useEffect(() => {
    if (initialMediaUrl) setPreviewUrl(initialMediaUrl);
  }, [initialMediaUrl]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get token from auth
      const { getClientAuth } = await import('@/lib/firebase/client');
      const token = await getClientAuth().currentUser?.getIdToken();

      const res = await fetch('/api/media/upload', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setValue('mediaUrl',  data.data.url);
      setValue('mediaType', file.type.startsWith('video') ? 'video' : 'image');
      toast('success', 'File uploaded successfully');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed');
      setUploadFile(null);
      setPreviewUrl(initialMediaUrl);
    } finally {
      setUploading(false);
    }
  }

  function clearMedia() {
    setValue('mediaUrl',  '');
    setValue('mediaType', 'none');
    setPreviewUrl('');
    setUploadFile(null);
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      await createPost({
        ...data,
        scheduledTime: data.status === 'scheduled' ? data.scheduledTime ?? null : null,
      } as PostFormData);
      toast('success', 'Post saved!');
      router.push('/posts');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/posts" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to posts
        </Link>
        <h2 className="text-xl font-bold text-stone-900">New Post</h2>
        <p className="text-stone-500 text-sm mt-0.5">Compose a post and schedule it for publishing.</p>
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

        {/* Platform */}
        <div>
          <label className="label block mb-1.5">Platform *</label>
          <select {...register('platform')} className="input-base">
            <option value="">Select platform…</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {errors.platform && <p className="text-xs text-red-500 mt-1">{errors.platform.message}</p>}
        </div>

        {/* Caption */}
        <div>
          <label className="label block mb-1.5">Caption *</label>
          <textarea
            {...register('caption')}
            rows={5}
            className="input-base resize-none"
            placeholder="Write your caption here…"
          />
          {errors.caption && <p className="text-xs text-red-500 mt-1">{errors.caption.message}</p>}
        </div>

        {/* Media */}
        <div>
          <label className="label block mb-1.5">Media</label>
          {previewUrl ? (
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden bg-stone-100 w-full aspect-video max-w-xs">
                <Image src={previewUrl} alt="Preview" fill className="object-contain" sizes="320px" />
              </div>
              <button
                type="button"
                onClick={clearMedia}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-stone-600 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-stone-200 hover:border-brand-400 cursor-pointer bg-stone-50 hover:bg-brand-50/30 transition-colors">
              <Upload className="h-6 w-6 text-stone-400 mb-2" />
              <p className="text-sm text-stone-400">Click to upload image or video</p>
              <p className="text-xs text-stone-300 mt-0.5">PNG, JPG, GIF, MP4 up to 50MB</p>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
          {uploading && <p className="text-xs text-stone-400 mt-1">Uploading…</p>}

          {/* Or enter URL */}
          <div className="mt-2">
            <input
              {...register('mediaUrl')}
              className="input-base text-xs"
              placeholder="Or paste an external media URL"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="label block mb-1.5">Status</label>
          <div className="flex gap-3">
            {(['draft', 'scheduled', 'posted'] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={s}
                  {...register('status')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-stone-700 capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Schedule time (only when status = scheduled) */}
        {status === 'scheduled' && (
          <div>
            <label className="label block mb-1.5">Schedule Date & Time *</label>
            <input
              type="datetime-local"
              {...register('scheduledTime')}
              className="input-base"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving}>Save Post</Button>
          <Link href="/posts">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
