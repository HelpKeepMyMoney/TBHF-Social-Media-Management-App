'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useCampaigns } from '@/hooks/useCampaigns';
import { usePosts } from '@/hooks/usePosts';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Upload, X, Sparkles, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { Post, PostFormData } from '@/types';

const schema = z.object({
  campaignId:    z.string().min(1, 'Select a campaign'),
  caption:       z.string().min(1, 'Caption is required').max(2120),
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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function EditPostPage() {
  const router   = useRouter();
  const params   = useParams();
  const id       = params?.id as string | undefined;
  const { campaigns } = useCampaigns();
  const { updatePost } = usePosts();
  const { apiFetch }  = useApi();
  const toast         = useToast();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      campaignId: '',
      caption:    '',
      platform:  '',
      mediaUrl:   '',
      mediaType: 'none',
      status:    'draft',
      scheduledTime: null,
    },
  });

  const status     = watch('status');
  const mediaUrl   = watch('mediaUrl');
  const campaignId = watch('campaignId');
  const platform   = watch('platform');
  const mediaType  = watch('mediaType');
  const caption    = watch('caption');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    apiFetch<Post>(`/api/posts/${id}`).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success || !res.data) {
        setNotFound(true);
        return;
      }
      const post = res.data;
      reset({
        campaignId: post.campaignId,
        caption:    post.caption,
        platform:   post.platform,
        mediaUrl:   post.mediaUrl ?? '',
        mediaType:  post.mediaType ?? 'none',
        status:     post.status,
        scheduledTime: toDatetimeLocal(post.scheduledTime),
      });
      if (post.mediaUrl) setPreviewUrl(post.mediaUrl);
    });
    return () => { cancelled = true; };
  }, [id, apiFetch, reset]);

  useEffect(() => {
    if (mediaUrl && !previewUrl) setPreviewUrl(mediaUrl);
  }, [mediaUrl, previewUrl]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

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
      setPreviewUrl(mediaUrl || '');
    } finally {
      setUploading(false);
    }
  }

  async function clearMedia() {
    const urlToDelete = mediaUrl;
    setValue('mediaUrl',  '');
    setValue('mediaType', 'none');
    setPreviewUrl('');
    setUploadFile(null);

    if (urlToDelete && (urlToDelete.includes('storage.googleapis.com') || urlToDelete.includes('firebasestorage.googleapis.com'))) {
      try {
        const { getClientAuth } = await import('@/lib/firebase/client');
        const token = await getClientAuth().currentUser?.getIdToken();
        await fetch('/api/media/delete', {
          method:  'POST',
          headers:  { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:     JSON.stringify({ url: urlToDelete }),
        });
      } catch {
        // Fire-and-forget; don't block UI
      }
    }
  }

  async function handleGenerateCaption() {
    if (!campaignId || !platform) {
      toast('error', 'Please select a campaign and platform first');
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ caption: string; hashtags: string[] }>('/api/ai/caption', {
        method: 'POST',
        body:   JSON.stringify({
          campaignId,
          platform,
          mediaType: mediaType || 'none',
          tone:      'inspirational',
        }),
      });
      if (!res.success) throw new Error(res.error);
      const captionWithHashtags = res.data.hashtags?.length
        ? `${res.data.caption}\n\n${res.data.hashtags.join(' ')}`
        : res.data.caption;
      setValue('caption', captionWithHashtags);
      toast('success', 'Caption generated!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to generate caption');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateImage() {
    if (!campaignId || !platform) {
      toast('error', 'Please select a campaign and platform first');
      return;
    }
    if (!caption?.trim()) {
      toast('error', 'Please add a caption first so we can generate a matching image');
      return;
    }
    setGeneratingImage(true);
    try {
      const res = await apiFetch<{ storageUrl: string }>('/api/ai/image/post', {
        method: 'POST',
        body:   JSON.stringify({
          campaignId,
          caption,
          platform,
          dimensions: '1:1',
        }),
      });
      if (!res.success) throw new Error(res.error);
      setValue('mediaUrl', res.data.storageUrl);
      setValue('mediaType', 'image');
      setPreviewUrl(res.data.storageUrl);
      toast('success', 'Image generated and attached!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  }

  async function onSubmit(data: FormValues) {
    if (!id) return;
    setSaving(true);
    try {
      const scheduledTime = data.status === 'scheduled' && data.scheduledTime
        ? new Date(data.scheduledTime).toISOString()
        : null;
      await updatePost(id, {
        ...data,
        scheduledTime,
      } as Partial<PostFormData>);
      toast('success', 'Post updated!');
      router.push('/posts');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  if (notFound || !id) {
    return (
      <div className="max-w-2xl">
        <div className="card p-12 text-center">
          <h3 className="font-semibold text-stone-700">Post not found</h3>
          <p className="text-sm text-stone-400 mt-1">This post may have been deleted or you don&apos;t have access to it.</p>
          <Link href="/posts" className="inline-block mt-4">
            <Button variant="secondary">Back to posts</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/posts" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to posts
        </Link>
        <h2 className="text-xl font-bold text-stone-900">Edit Post</h2>
        <p className="text-stone-500 text-sm mt-0.5">Update your post and schedule.</p>
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="label">Caption *</label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGenerateCaption}
              loading={generating}
              disabled={!campaignId || !platform || generating}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate with AI
            </Button>
          </div>
          <textarea
            {...register('caption')}
            rows={5}
            className="input-base resize-none"
            placeholder="Write your caption here…"
          />
          {errors.caption && <p className="text-xs text-red-500 mt-1">{errors.caption.message}</p>}
          <p className="text-xs text-stone-400 mt-1">
            The donation tagline will be automatically appended to your post.
          </p>
        </div>

        {/* Media */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label">Media</label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGenerateImage}
              loading={generatingImage}
              disabled={!campaignId || !platform || !caption?.trim() || generatingImage}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              Generate image with AI
            </Button>
          </div>
          {previewUrl ? (
            <div className="relative">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden w-full aspect-video max-w-xs cursor-pointer hover:opacity-95 transition-opacity"
              >
                <div className="relative rounded-xl overflow-hidden bg-stone-100 w-full h-full">
                  <Image src={previewUrl} alt="Preview" fill className="object-contain" sizes="320px" />
                </div>
              </a>
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

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving}>Update Post</Button>
          <Link href="/posts">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
