import { addDays, startOfDay, weekDays } from "./calendar";

export type CalPostStatus = "published" | "scheduled" | "failed";
export type CalPlatform = "linkedin" | "x";

export type CalPost = {
  id: string;
  day: Date;
  hour: number;
  title: string;
  body: string;
  platforms: CalPlatform[];
  status: CalPostStatus;
  account: string;
  media?: string;
  error?: string;
};

export function sampleCalendarPosts(today: Date): CalPost[] {
  const y = addDays(today, -1);
  const t = startOfDay(today);
  const n = addDays(today, 1);
  const sat = weekDays(today)[5];
  const nowH = new Date().getHours();
  const pastHour = nowH === 0 ? 0 : Math.max(7, nowH - 2);
  const soonHour = nowH >= 22 ? 23 : Math.max(nowH + 1, Math.min(21, nowH + 2));

  return [
    {
      id: "y-morning-in",
      day: y,
      hour: 9,
      title: "Festive drop is live. Link in comments.",
      body: "The mango drop is live. 400 jars, same-day dispatch from Bhubaneswar. If you already ordered — packing starts in 20 minutes.",
      platforms: ["linkedin"],
      status: "published",
      account: "postN",
      media: "Product still · 1:1",
    },
    {
      id: "y-morning-x",
      day: y,
      hour: 9,
      title: "Warehouse lights on. 9am drop.",
      body: "Warehouse lights on. 9am drop. If you’re in Odisha, you get it tonight.",
      platforms: ["x"],
      status: "published",
      account: "postN",
    },
    {
      id: "y-eve",
      day: y,
      hour: 18,
      title: "Sold the mango drop in 40 minutes.",
      body: "Sold the mango drop in 40 minutes. Next batch is Sunday. No waitlist, just a time.",
      platforms: ["x"],
      status: "published",
      account: "postN",
    },
    {
      id: "y-fail",
      day: y,
      hour: 21,
      title: "Carousel didn’t post — image too wide.",
      body: "Three slides: the orchard, the jar, the packing table. Meant for LinkedIn tonight.",
      platforms: ["linkedin"],
      status: "failed",
      account: "postN",
      media: "Carousel · 3 slides",
      error: "LinkedIn rejected the second slide (1200×628). Need 1:1 or 4:5.",
    },
    {
      id: "t-past",
      day: t,
      hour: pastHour,
      title: "Ops standup notes from the warehouse.",
      body: "Ops standup: 62 orders packed, 4 delayed to Cuttack, courier pickup at 7. Sharing so the team sees the same numbers.",
      platforms: ["x"],
      status: "published",
      account: "postN",
    },
    {
      id: "t-soon",
      day: t,
      hour: soonHour,
      title: "Founder note: why we stayed D2C.",
      body: "We stayed D2C because a Kirana margin would have killed the fruit. This is the note for founders who keep getting the same advice.",
      platforms: ["linkedin"],
      status: "scheduled",
      account: "postN",
    },
    {
      id: "n-mid",
      day: n,
      hour: 11,
      title: "Unboxing reel — 15 seconds, no voiceover.",
      body: "15 seconds. No voiceover. Just the peel, the jar, the table. Same cut for X and LinkedIn.",
      platforms: ["x", "linkedin"],
      status: "scheduled",
      account: "postN",
      media: "Reel · 9:16",
    },
    {
      id: "n-mid-in",
      day: n,
      hour: 11,
      title: "Why we film unboxings without voiceover.",
      body: "Voiceover fights the product. The peel is the story. A short note for other D2C folks shooting in a warehouse.",
      platforms: ["linkedin"],
      status: "scheduled",
      account: "postN",
    },
    {
      id: "n-mid-x",
      day: n,
      hour: 11,
      title: "15s. No voice. Just the peel.",
      body: "15s. No voice. Just the peel.",
      platforms: ["x"],
      status: "scheduled",
      account: "postN",
      media: "Clip · 15s",
    },
    {
      id: "n-night",
      day: n,
      hour: 19,
      title: "Tomorrow’s restock. Set a reminder.",
      body: "Sunday restock, 7pm IST. Same mango, 200 jars. Set a reminder — last drop vanished in 40 minutes.",
      platforms: ["x"],
      status: "scheduled",
      account: "postN",
    },
    {
      id: "sat-1",
      day: sat,
      hour: 10,
      title: "Packing table, 10am.",
      body: "Packing table at 10. If you ordered Thursday, this is your box.",
      platforms: ["x"],
      status: "scheduled",
      account: "postN",
      media: "Story still",
    },
    {
      id: "sat-2",
      day: sat,
      hour: 12,
      title: "Courier has the bags.",
      body: "Courier has the bags. Tracking by evening.",
      platforms: ["linkedin"],
      status: "scheduled",
      account: "postN",
    },
    {
      id: "sat-3",
      day: sat,
      hour: 15,
      title: "What we changed in this batch.",
      body: "Thicker gasket, shorter copy on the lid. Small, but the last 400 told us.",
      platforms: ["linkedin", "x"],
      status: "scheduled",
      account: "postN",
    },
    {
      id: "sat-4",
      day: sat,
      hour: 17,
      title: "Sunday drop reminder.",
      body: "Sunday 7pm. 200 jars. No waitlist.",
      platforms: ["x"],
      status: "scheduled",
      account: "postN",
    },
    {
      id: "sat-5",
      day: sat,
      hour: 20,
      title: "Founder AMA — packing questions.",
      body: "I’ll sit on X at 8pm and answer packing / shipping questions. Bring the spicy ones.",
      platforms: ["x"],
      status: "scheduled",
      account: "postN",
    },
  ];
}

export function postsOnDay(posts: CalPost[], day: Date) {
  const t = startOfDay(day).getTime();
  return posts
    .filter((post) => startOfDay(post.day).getTime() === t)
    .sort((a, b) => a.hour - b.hour);
}

export function groupPostsByHour(posts: CalPost[]) {
  const map = new Map<number, CalPost[]>();
  for (const post of posts) {
    const list = map.get(post.hour) ?? [];
    list.push(post);
    map.set(post.hour, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}
