export const ZONES = [
  { id: 'top_left',    label: 'Top Left',    short: 'TL' },
  { id: 'top_right',   label: 'Top Right',   short: 'TR' },
  { id: 'bar_down',    label: 'Bar Down',    short: 'BD' },
  { id: 'left_post',   label: 'Left Post',   short: 'LP' },
  { id: 'right_post',  label: 'Right Post',  short: 'RP' },
  { id: 'low_glove',   label: 'Low Glove',   short: 'LG' },
  { id: 'low_blocker', label: 'Low Blocker', short: 'LB' },
]

export const NET_POS = {
  top_left:    { cx: 56,  cy: 64,  r: 27 },
  top_right:   { cx: 344, cy: 64,  r: 27 },
  bar_down:    { rect: true, x: 92, y: 40, w: 216, h: 26 },
  left_post:   { cx: 30,  cy: 122, r: 20 },
  right_post:  { cx: 370, cy: 122, r: 20 },
  low_glove:   { cx: 60,  cy: 178, r: 27 },
  low_blocker: { cx: 340, cy: 178, r: 27 },
}
