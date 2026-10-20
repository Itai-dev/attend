# Where the sounds come from

Real field recordings from radio aporee (aporee.org), as archived on the Internet Archive.
Each item is marked Public Domain (https://creativecommons.org/publicdomain/mark/1.0/) by its
recordist, so no attribution is required. We credit them anyway, with thanks. The archive.org
identifier is the provenance record. `tools/master-recordings.py` rebuilds every file from these
identifiers.

| Sound | Recording | Recordist | archive.org item | Excerpt |
|---|---|---|---|---|
| rain | Light rain, banana field, Telaya, Veracruz, Mexico | Felix Blume | `aporee_48133_54753` | 4:20–9:20 |
| forest | Forest atmosphere, insects and wind, Ustka, Poland | Piotrek Zyla | `aporee_64630_74591` | 0:10–5:10 |
| stream | Stream Krčnik, Slovenia | Bojan Marušič | `aporee_50749_57876` | 4:15–9:15 |
| waterfall | Cascade du Liaret, Sixt-Fer-à-Cheval, French Alps | Jean-François Cavro | `aporee_72832_85026` | 0:30–5:30 |
| ocean | Sea waves from a distance, Dąbki, Poland | Piotrek Zyla | `aporee_64627_74588` | 2:13–7:13 |
| night | Night crickets, La Clapère, Maureillas-las-Illas, France | (aporee recordist) | `aporee_70515_82219` | 2:30–7:30 |
| fire | Fireplace in the woods, Mierki, Poland | (aporee recordist) | `aporee_54707_62564` | 0:05–4:40 |

The soft tone (`../tone-432.m4a`) is synthesized.

**Processing:**
- A high-pass filter for wind and traffic rumble.
- One static gain per sound.
- Peak rounding on the loudest few transients only: under 0.03% of samples.
- No compression, so the natural rise and fall of waves, gusts and crackles is kept.
