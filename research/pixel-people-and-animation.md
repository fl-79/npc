# Pixel people and animation: a study of three references (2026-11-13)

The owner shared three images: a sheet of 49 chibi characters, a top-down butcher's shop and a
top-down clinic, all in the same family of cosy pixel sims. This note records how their people are
drawn and how scenes like these are animated, and what NPC V2 took from them. The figures in the tool
are original, drawn by code from each agent's data in this style; none of the reference characters
is copied.

## How the people are drawn

| Feature | What the references do | What NPC V2 does |
|---|---|---|
| Proportions | Chibi: the head is about half the figure's height and wider than the body. Arms and legs are stubs. | A 16 x 24 cell: head 12 wide and 11 tall, body with arms 10 wide, legs 3 rows, shoes 2 rows. |
| Outline | One dark pixel round the whole silhouette, dark brown rather than black. No outline inside the figure. | An outline pass over each frame: every empty pixel touching the figure turns ink brown. |
| Face | Two dark eyes, one pixel wide and two tall. No mouth, no nose; sometimes a blush pixel or glasses. | The same, with glasses, blush and beards spread over the population. |
| Hair | The largest shape and the most varied: bangs with a jagged edge, buns, pigtails, afros, spikes, bobs, long hair over the shoulders. One or two lighter highlight pixels, a darker side. | Eight styles (crop, side part, bob, long, bun, curls, spikes, receding), a highlight and a shaded side. |
| Clothes | A flat shirt colour with one darker side; stripes, aprons and lab coats for character. Legs in trousers, dark shoes. | Shirt with a shaded side, short or long sleeves, an open jacket for instructors; a share of students in black, as architecture students are. |
| Diversity | Skin tones from very light to very dark, hair colours including greys and dyed colours. | Seven skin tones, natural and dyed hair, greys for some instructors. Drawn at random from the agent's id and the run's seed, so a seed gives the same faces. |
| In a room | People are about 1.5 tiles tall, in front or back view, seated behind counters with only head and shoulders showing, with a soft shadow at the feet. | People at 1.5 tiles, four facings, a seated pose that lowers the body over a lap, and a shadow under the feet. |

The look is for legibility and life only. It carries no data: skin, hair and clothes are a visual mix
and do not stand for any attribute of an agent.

## How scenes like these are animated

Still images don't show motion, so this section comes from how games in this family usually move
their people (top-down management and life sims). The aim is that something on screen always moves
a little, and that every move means something.

1. **Walking:** a four-beat cycle of step, stand, other step, stand at about 8 frames a second. The
   lifted foot rises one pixel and the opposite hand swings. Facing follows the direction of travel.
2. **Idling:** a one-pixel breath every second or so and a blink of about 0.1 s every few seconds.
   Each person runs at a slightly different speed and phase, so a crowd never moves in step.
3. **Working seated:** a typing loop with the hands alternating and a pause now and then. Reading
   or eating sits still and only blinks.
4. **Emote bubbles:** a small white bubble with an icon (talk dots, ?, !, an excited !!, a note, a check,
   a cup, a page, Z) pops in with a slight overshoot, holds about two seconds, then rises and fades.
   The clinic's question-mark and price bubbles are this device. It is the cheapest way to show what
   a person is thinking without text.
5. **Objects:** screens that glow and flicker, a machine's busy light, steam over a kettle. Built
   2026-11-13, each read from the run's state (table below).

## What the bubbles mean in NPC V2

Each bubble comes from an event the run already records, so a bubble is a fact, not decoration.

| Bubble | Shown when |
|---|---|
| Excited !! (orange) | Two people from different years talk: the between-year tie the study cares about. The owner asked for an excited bubble rather than a heart (2026-11-13). |
| Talk dots | A conversation, a hello in passing, an office-hour visit, the instructor's side of a crit. |
| ? | A student's desk crit starts. |
| ! | The plotters run out of paper; an instructor gathers the section. |
| Page | Someone joins the plotter queue. |
| Check | A plot is done or a crit is over. |
| Note | Headphones go on. |
| Cup | A snack, lunch or dinner. |
| Z | A late arrival or a late leave. |

Bubbles are rate-limited, because at high run speeds the events come in bursts: one bubble per
person every few seconds, a cap on how many show at once, and remarks give way to the events above.

## What the objects do in NPC V2 (2026-11-13)

| Object | Moves when |
|---|---|
| Plotters | Printing: a green blink and a sheet feeding out. Paper out with someone waiting: a red blink. |
| Small printers | Someone prints at one: a green blink and a page. |
| 3D printers | A print is in progress: an orange light and the nozzle sweeping, one printer per running print. |
| Kettle, coffee machine | Someone within a few metres takes a break, a snack or a meal: steam rises. |
| Microwave | Someone eats nearby: a warm window, a soft halo and a turning plate. |
| Lab computers | Someone works at the station: a lit screen with a scrolling line; otherwise a drifting dot. |
| Screen and projector | Three or more people in a lecture, a seminar, a review or a crit nearby: slides change every few seconds. |
| Beer taps | An event runs in the lounge: a drip. |
| Desks | Someone works at their own desk: a laptop glows on the desk. |

Small appliances are a few pixels at a floor's zoom, so their light carries a soft halo. The light is
a warm cream, not the amber that outlines objects the owner added.
