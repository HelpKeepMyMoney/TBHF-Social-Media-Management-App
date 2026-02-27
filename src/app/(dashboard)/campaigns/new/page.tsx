'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { CampaignFormData } from '@/types';

const schema = z.object({
  name:            z.string().min(1, 'Campaign name is required').max(100),
  description:     z.string().max(500).default(''),
  startDate:       z.string().min(1, 'Start date is required'),
  endDate:         z.string().min(1, 'End date is required'),
  fundraisingGoal: z.coerce.number().min(0).default(0),
  awarenessGoal:   z.string().max(200).default(''),
  hashtag:         z.string().max(50).default(''),
  keyMessage:      z.string().max(500).default(''),
});

type FormValues = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const router          = useRouter();
  const { createCampaign } = useCampaigns();
  const toast           = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      const campaign = await createCampaign(data as CampaignFormData);
      toast('success', 'Campaign created successfully!');
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to campaigns
        </Link>
        <h2 className="text-xl font-bold text-stone-900">New Campaign</h2>
        <p className="text-stone-500 text-sm mt-0.5">Define your campaign goals and messaging strategy.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        {/* Campaign name */}
        <div>
          <label className="label block mb-1.5">Campaign Name *</label>
          <input {...register('name')} className="input-base" placeholder="e.g. Spring Fundraising Drive 2026" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label block mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="input-base resize-none"
            placeholder="Brief overview of this campaign's purpose and goals"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Start Date *</label>
            <input type="date" {...register('startDate')} className="input-base" />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="label block mb-1.5">End Date *</label>
            <input type="date" {...register('endDate')} className="input-base" />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>

        {/* Goals */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Fundraising Goal (USD)</label>
            <input
              type="number"
              min="0"
              step="100"
              {...register('fundraisingGoal')}
              className="input-base"
              placeholder="0"
            />
          </div>
          <div>
            <label className="label block mb-1.5">Awareness Goal</label>
            <input
              {...register('awarenessGoal')}
              className="input-base"
              placeholder="e.g. Reach 10,000 people"
            />
          </div>
        </div>

        {/* Hashtag */}
        <div>
          <label className="label block mb-1.5">Campaign Hashtag</label>
          <input
            {...register('hashtag')}
            className="input-base"
            placeholder="#SpringForHope"
          />
        </div>

        {/* Key message */}
        <div>
          <label className="label block mb-1.5">Key Message</label>
          <textarea
            {...register('keyMessage')}
            rows={2}
            className="input-base resize-none"
            placeholder="The core message all content should reinforce"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={saving}>Create Campaign</Button>
          <Link href="/campaigns">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
