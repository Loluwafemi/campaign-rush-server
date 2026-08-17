export interface EventTemplate {
  id: string;
  category: string;
  title: string;
  rationale: string;
  fields: {
    name: string;
    description: string;
    targetUrlLabel: string;
    targetUrlExample: string;
    durationNumber: string;
    durationUnit: "hours" | "days";
    durationNote: string;
    coverImageTip: string;
  };
}

export const eventTemplates: EventTemplate[] = [
  {
    id: "business-launch",
    category: "Business",
    title: "Business Launch / Grand Opening",
    rationale:
      "7 days is long enough for word to spread past your immediate circle, short enough that \u201Copening week\u201D still feels like a real event.",
    fields: {
      name: "Grand Opening — [Business Name] is Live",
      description:
        "We're officially open! Bring a friend and be part of our first week — every referral helps us grow.",
      targetUrlLabel: "Booking page, WhatsApp business line, or Google Business profile link",
      targetUrlExample: "https://wa.me/1234567890",
      durationNumber: "7",
      durationUnit: "days",
      durationNote: "Paste into the number field, then select \u201Cdays.\u201D",
      coverImageTip: "Storefront photo, opening-day flyer, or your logo on a clean background",
    },
  },
  {
    id: "membership-acquisition",
    category: "Members / Customer Gain",
    title: "Membership / Customer Acquisition",
    rationale:
      "Acquisition referrals work best as an ongoing habit, not a scramble — a longer window gives your best referrers time to convert people gradually.",
    fields: {
      name: "Refer a Friend, Both of You Get [X]",
      description:
        "Invite someone who'd love this too. When they join, you both get [reward] — no limit on how many friends you bring.",
      targetUrlLabel: "Your sign-up page or plan-selection page",
      targetUrlExample: "https://yourapp.com/signup?ref=event",
      durationNumber: "21",
      durationUnit: "days",
      durationNote: "Paste into the number field, then select \u201Cdays.\u201D Suggested range: 14\u201330.",
      coverImageTip: "A shot of the reward/perk itself reads better here than a generic logo",
    },
  },
  {
    id: "product-marketing",
    category: "Product Marketing",
    title: "Product Launch or Feature Drop",
    rationale:
      "Launches live or die on momentum. A short, intense window matches the \u201Cthis is happening right now\u201D energy a product drop needs.",
    fields: {
      name: "[Product Name] Just Dropped",
      description:
        "It's here. Get early access by sharing your link — the more people you bring in, the higher you climb before [date].",
      targetUrlLabel: "Product page, waitlist form, or app store listing",
      targetUrlExample: "https://yourproduct.com/waitlist",
      durationNumber: "4",
      durationUnit: "days",
      durationNote: "Paste into the number field, then select \u201Cdays.\u201D Suggested range: 3\u20135.",
      coverImageTip: "Your actual product shot or launch graphic — this is worth getting right",
    },
  },
  {
    id: "website-marketing",
    category: "Website Marketing",
    title: "Website / Content Marketing Push",
    rationale:
      "Content needs enough runway to be discovered and re-shared organically, but a defined end date keeps referrers checking back.",
    fields: {
      name: "Help Us Get [Content/Newsletter] Off the Ground",
      description:
        "We just launched [thing] and want as many eyes on it as possible in the first week. Share your link and see your reach on the board.",
      targetUrlLabel: "The specific page, post, or newsletter sign-up — not just your homepage",
      targetUrlExample: "https://yourblog.com/newsletter",
      durationNumber: "10",
      durationUnit: "days",
      durationNote: "Paste into the number field, then select \u201Cdays.\u201D Suggested range: 7\u201314.",
      coverImageTip: "A screenshot or header image of the actual content — concrete beats abstract",
    },
  },
  {
    id: "event-outreach",
    category: "Events / Ads / Outreach",
    title: "Conference, Wedding, or Program Enrollment",
    rationale:
      "End it 1\u20132 days before the real deadline, not on the day — a countdown that ends as the event starts is too late to act on.",
    fields: {
      name: "[Event Name] — Help Us Fill the Room",
      description: "[Event] is happening on [date]. Invite people who should be there — RSVPs close soon.",
      targetUrlLabel: "Your RSVP form, ticketing page, or program application",
      targetUrlExample: "https://yourevent.com/rsvp",
      durationNumber: "5",
      durationUnit: "days",
      durationNote: "Set this to end 1\u20132 days before your actual RSVP deadline.",
      coverImageTip: "Event branding, venue photo, or a save-the-date graphic",
    },
  },
  {
    id: "community-growth",
    category: "Community / Group Growth",
    title: "WhatsApp, Telegram, or Discord Group Growth",
    rationale:
      "This is the flow every other part of the product (crawler filtering, duplicate-click protection) was purpose-built around.",
    fields: {
      name: "[Community Name] Growth Week",
      description: "Join our community before the timer runs out — invite the people you think should be here too.",
      targetUrlLabel: "Your group's invite link",
      targetUrlExample: "https://chat.whatsapp.com/your-invite-code",
      durationNumber: "3",
      durationUnit: "days",
      durationNote: "Paste into the number field, then select \u201Cdays.\u201D Suggested range: 2\u20133 for a burst, up to 7 for a slower build.",
      coverImageTip: "A screenshot of the community in action, or a simple branded card with the group's name",
    },
  },
];
