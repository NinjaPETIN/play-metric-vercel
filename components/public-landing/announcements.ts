export type Announcement = {
  id: string;
  message: string;
  action: string;
  href: string;
  startsAt?: string;
  endsAt?: string;
};

// Add confirmed campaigns here. Use ISO timestamps with an explicit timezone.
// An empty list hides the announcement bar.
export const announcements: readonly Announcement[] = [
  {id: 'pro', message: 'Conocé Statlane Pro', action: 'Ver planes', href: '/planes'},
  {id: 'nba', message: 'Seguí la jornada NBA en Statlane', action: 'Ver partidos', href: '/?view=calendar'},
];

export function activeAnnouncements(now = Date.now()) {
  return announcements.filter(({startsAt, endsAt}) =>
    (!startsAt || Date.parse(startsAt) <= now) &&
    (!endsAt || now < Date.parse(endsAt)),
  );
}
