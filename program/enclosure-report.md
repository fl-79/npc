# Enclosure check

Written by scripts/check_enclosure.py from exports/tiles. An open edge is a run of a room's open tiles touching
Rooms with something to look at: Basement 1, Level 1 0, Level 2 0, Level 3 2, Level 4 0.

open tiles that are not the room's, with nothing painted between: a wall the model lacks, a room separation line, or a
space meant to be open. Review each; a correction goes in program/edits.json.

## Basement

- room 74 (Workshop), 147 m2: no door


## Level 1

- every room enclosed, with a door

## Level 2

- every room enclosed, with a door

## Level 3

- room 10 (Student lounge), 50 m2: open on the south to room 11 (studio) for 7.0 m; open on the west to room 11 (studio) for 1.5 m
- room 11 (studio), 725 m2: open on the north to room 10 (Student lounge) for 7.0 m; open on the east to room 10 (Student lounge) for 1.5 m


## Level 4

- every room enclosed, with a door

