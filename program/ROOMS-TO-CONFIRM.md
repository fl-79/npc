# Rooms to confirm

Kept since 2026-11-11 at the owner's request. Each row is a room the tool uses on an inference
(from the 2024 Architecture Program Report, the website, or the model's geometry) that a look at the
door sign, the room, or the Revit model would settle. Answer by the model's room number in chat; the
change is applied with a dated script in `scripts/` and the row is moved to "Confirmed". The
`apr_room` fields in `rooms.json` and the flags in `TODO.md` follow this list.

## To confirm

| # | Model room | Level | The tool assumes | What to check | Source of the assumption |
|---|---|---|---|---|---|
| 1 | 22, Large classroom | 2 | The APR's room 202: 64 chairs in four rows of four tables, capacity 60 | Is 22 room 202? How many seats does it really have? | APR24 (capacity 60); owner 2026-11-11 ("the largest classroom with seats is probably 202") |
| 2 | 30, crit room | 2 | A crit room with no tables or chairs, used from its floor (24 spots) | Is it really unfurnished? Is it a crit room at all? | model (no furniture); owner 2026-11-08 (Q16) |
| 3 | 4, crit room (south) | 3 | The APR's 301 | The door sign | APR24 (301 and 309); 303A beside room 4 |
| 4 | 1, crit room (north) | 3 | The APR's 309 | The door sign | as above |
| 5 | 5, Photography room | 3 | The APR's 303A | The door sign | APR24 ("photo documentation space ... in room 303A") |
| 6 | 12, 13, 15, classrooms | 1 | The APR's 102, 104 and 105 (105 the digital teaching space) | Which number is which | APR24 (UBC holdings on the first floor) |
| 7 | 74, Workshop | B | The APR's Room 2, the shop | The door sign | APR24 ("the shop ... in Room 2") |
| 8 | 75, Model assembly room | B | The APR's Room 5: shop extension, work-benches, a projector, open 24/7 | Is it Room 5? Is it open 24/7 (the tool keeps business hours)? Where is 5C? | APR24 Action 2 |
| 9 | 70 or 77 (flagged) | B | One of them is the APR's Room 9, the Materials Lab (former reading room, 1000+ sq ft, bookable for seminars and reviews) | Which one, and is it bookable by students? | APR24 |
| 10 | 71, 76 (flagged) | B | Nothing yet | What they are | — |
| 11 | 34, Administrative office (placeholder) | 2 | A placeholder admin office, 162 m² | What the room is; the APR puts the main office at 402 on the fourth floor | APR24, sala.ubc.ca |
| 12 | 55, shared office | 4 | Shared desks, count unknown; the only Level 4 candidate for the main office 402 | Is it the main office? How many desks? | APR24, sala.ubc.ca |
| 13 | 11, studio: north-west bay | 3 | A table closes off four desks; the engine rolls it aside (4 tiles, logged in `world.gaps`) | Is the table there in the room? In Revit? | model geometry |
| 14 | 20, 23–29, 36, 37 and the Level 4 offices | 2, 4 | Instructors' offices are given out on Level 2 first, then 4, then 3 | Which offices are studio instructors' | sala.ubc.ca profiles (offices 201C–205B, 309B, 414, 420) |

## Confirmed

| # | Model room | Confirmed as | When |
|---|---|---|---|
| — | | | |
