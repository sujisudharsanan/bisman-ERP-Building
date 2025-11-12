# Calendar Layout Visual Guide 🎨

## Desktop Layout (≥1280px)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                                 │
│  ┌───────────────┬──────────────────────────────────────────────┬──────────────────┐  │
│  │ Studio 813    │  ◀  3  4  5  6  7  8  9  ▶                  │ ⚙️  + New Appt   │  │
│  │ Yogaplatsen   │     M  T  W  T  F  S  S                      │                  │  │
│  └───────────────┴──────────────────────────────────────────────┴──────────────────┘  │
│  🟠 Request Approval                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┬─────────────────┐
│  SCHEDULE GRID (3 columns)                                           │  SIDEBAR        │
│                                                                       │                 │
│  ┌──────────────┬──────────────┬──────────────┐                    │  ┌─────────────┐│
│  │ MON, 3       │ TUE, 4       │ WED, 5       │                    │  │   Avatar    ││
│  │ 3 events     │ 4 events     │ 2 events     │                    │  │  AR         ││
│  │              │              │              │                    │  └─────────────┘│
│  │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │                    │  Amelia Rhodes  │
│  │ │ 🟣 CARD  │ │ │ 🟠 CARD  │ │ │ 🔵 CARD  │ │                    │  Instructor     │
│  │ │ 78%      │ │ │ 65%      │ │ │ 90%      │ │                    │                 │
│  │ │ Team     │ │ │ Budget   │ │ │ Client   │ │                    │  Today's Stats  │
│  │ │ Standup  │ │ │ Review   │ │ │ Meeting  │ │                    │  60% occupied   │
│  │ │          │ │ │          │ │ │          │ │                    │                 │
│  │ │ 📍 ROOM A│ │ │ 📍 ROOM B│ │ │ 📍 HALL  │ │                    │                 │
│  │ │ ⏰ 9-9:30│ │ │ ⏰10-11  │ │ │⏰ 14-15:30│ │                    │                 │
│  │ │          │ │ │          │ │ │          │ │                    │                 │
│  │ │ SJ       │ │ │ MC       │ │ │ ER       │ │                    │                 │
│  │ │          │ │ │          │ │ │          │ │                    │                 │
│  │ │ 12/20    │ │ │ 10/15    │ │ │ 35/50    │ │                    │                 │
│  │ │ ███░░    │ │ │ ███░░    │ │ │ ████░    │ │                    │                 │
│  │ │          │ │ │          │ │ │          │ │                    │                 │
│  │ │ (hover)  │ │ │ (hover)  │ │ │ (hover)  │ │                    │                 │
│  │ │[Details] │ │ │[Details] │ │ │[Details] │ │                    │                 │
│  │ └──────────┘ │ └──────────┘ │ └──────────┘ │                    │                 │
│  │              │              │              │                    │                 │
│  │ ┌──────────┐ │ ┌──────────┐ │              │                    │                 │
│  │ │ 🟢 CARD  │ │ │ 🌸 CARD  │ │              │                    │                 │
│  │ └──────────┘ │ └──────────┘ │              │                    │                 │
│  └──────────────┴──────────────┴──────────────┘                    │                 │
└──────────────────────────────────────────────────────────────────────┴─────────────────┘
```

## Tablet Layout (640px - 1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (Compact)                                               │
│  Studio 813    ◀  3 4 5 6 7 8 9  ▶    ⚙️  + New               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  SCHEDULE GRID (2 columns)                                   │
│                                                               │
│  ┌────────────────────┬────────────────────┐                │
│  │ MON, 3             │ TUE, 4             │                │
│  │ ┌────────────────┐ │ ┌────────────────┐ │                │
│  │ │ Event Card     │ │ │ Event Card     │ │                │
│  │ └────────────────┘ │ └────────────────┘ │                │
│  └────────────────────┴────────────────────┘                │
│                                                               │
│  ┌────────────────────┬────────────────────┐                │
│  │ WED, 5             │ THU, 6             │                │
│  └────────────────────┴────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

## Mobile Layout (< 640px)

```
┌─────────────────────────┐
│  HEADER (Minimal)       │
│  Studio 813             │
│  ◀ Week Nav ▶          │
│  🟠 Request Approval    │
└─────────────────────────┘

┌─────────────────────────┐
│  GRID (1 column)        │
│                         │
│  MON, 3 - 3 events      │
│  ┌─────────────────────┐│
│  │ 🟣 Team Standup     ││
│  │ 78%                 ││
│  │ ROOM A              ││
│  │ 9:00 - 9:30         ││
│  │ ███░░               ││
│  └─────────────────────┘│
│                         │
│  ┌─────────────────────┐│
│  │ 🟢 Training         ││
│  └─────────────────────┘│
│                         │
│  TUE, 4 - 4 events      │
│  ┌─────────────────────┐│
│  │ 🟠 Budget Review    ││
│  └─────────────────────┘│
└─────────────────────────┘
```

## Event Card Anatomy

```
┌───────────────────────────────────────┐
│ 🟣 LEFT BORDER (4px, color-coded)    │
│                                       │
│  Event Title                     78% ← Badge (color changes)
│  Brief description here               │
│                                       │
│  📍 CONFERENCE ROOM A                 │
│  ⏰ 9:00 - 9:30                       │
│  👤 SJ  Sarah Johnson                 │
│                                       │
│  12 OF 20                             │
│  ████████░░░░░░░░░░░░                │ ← Progress bar
│  ────────────────────────────────     │
│  [View Details]  [✏️]      ← On Hover │
└───────────────────────────────────────┘
```

## Color Legend

### Event Types
- 🟣 Purple   - Team Meetings/Standups
- 🟠 Orange   - Budget/Financial Reviews  
- 🔵 Blue     - Client Presentations
- 🟢 Green    - Training Sessions
- 🌸 Pink     - Planning/Workshops
- 🔷 Cyan     - Team Building

### Capacity Status
- 🟢 Green    - < 60% full
- 🟠 Orange   - 60-79% full
- 🔴 Red      - ≥ 80% full

### Interactive States
- **TODAY**: Blue background, white text, shadow
- **OTHER DAYS**: Gray hover, transparent default
- **HOVER CARD**: Elevated shadow, action buttons visible
- **CLICK CARD**: Opens event detail modal

## Interactive Elements

### Week Navigation
```
┌─────────────────────────────────────────┐
│  ◀   3   4   5   6   7   8   9   ▶    │
│      M   T   W   T   F   S   S         │
│          ↑                              │
│       TODAY (highlighted)               │
└─────────────────────────────────────────┘
```

### Capacity Progress Bar
```
0%                  50%                100%
├─────────────────────┼─────────────────┤
█████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
    ↑
  65% Full
  (Orange color)
```

### Hover Actions (Visible on Card Hover)
```
┌──────────────────────────────┐
│ [  View Details  ]    [✏️]   │
│       Primary       Edit     │
└──────────────────────────────┘
```

## Responsive Grid Behavior

```
Screen Size         Columns    Card Width    Sidebar
─────────────────────────────────────────────────────
< 640px (Mobile)      1         100%         Hidden
640px - 1024px        2         50%          Hidden
1024px - 1280px       3         33.3%        Hidden
≥ 1280px (Desktop)    3         33.3%        Visible
```

## Dark Mode Variants

### Light Mode
- Background: White/Gray-50
- Cards: Colored backgrounds (light variants)
- Text: Gray-900
- Borders: Gray-200

### Dark Mode  
- Background: Gray-900
- Cards: Colored backgrounds with 30% opacity
- Text: White/Gray-100
- Borders: Gray-700

---

**Visual Reference**: Based on UXDN Yoga Studio Design (Studio 813)  
**Implementation**: Fully responsive, interactive, dark mode compatible
