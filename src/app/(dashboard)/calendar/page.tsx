'use client';

import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { usePosts } from '@/hooks/usePosts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { PLATFORM_LABELS } from '@/lib/utils';
import type { Post } from '@/types';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

interface CalendarEvent {
  id:       string;
  title:    string;
  start:    Date;
  end:      Date;
  resource: Post;
}

const STATUS_COLORS: Record<string, string> = {
  draft:     '#a8a29e',
  scheduled: '#f59e0b',
  posted:    '#22c55e',
};

export default function CalendarPage() {
  const { posts, loading: postsLoad }   = usePosts();
  const { campaigns, loading: campLoad } = useCampaigns();

  const loading = postsLoad || campLoad;

  const events: CalendarEvent[] = useMemo(() => {
    return posts
      .filter((p) => !!p.scheduledTime)
      .map((p) => {
        const campaign = campaigns.find((c) => c.id === p.campaignId);
        const start    = new Date(p.scheduledTime!);
        const end      = new Date(start.getTime() + 30 * 60_000); // 30 min slot
        return {
          id:       p.id,
          title:    `[${PLATFORM_LABELS[p.platform] ?? p.platform}] ${p.caption.slice(0, 40)}`,
          start,
          end,
          resource: p,
        };
      });
  }, [posts, campaigns]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-600">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card p-4" style={{ height: 680 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          style={{ height: '100%' }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: STATUS_COLORS[event.resource.status] ?? '#d97706',
              borderColor:     STATUS_COLORS[event.resource.status] ?? '#c2670f',
              color:           '#fff',
              borderRadius:    '6px',
              fontSize:        '11px',
            },
          })}
          views={['month', 'week', 'agenda']}
          defaultView="month"
        />
      </div>
    </div>
  );
}
