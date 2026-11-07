# Mix Lyrics

A Spicetify extension for Spotify's mixed playlists. During a transition, [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) splits in two: the outgoing song keeps singing on the left and the incoming song sings on the right, mirrored, both synced syllable by syllable.

This is for playlists mixed in Spotify's transition editor, not for crossfade.

<img src="https://raw.githubusercontent.com/SrPictus/mix-lyrics/main/preview.png" alt="Illustration of two songs' lyrics side by side during a mix" width="480">

## Features

- Both songs on screen until the outgoing lyrics end, with Spicy Lyrics' own fonts and syllable animation
- Mirrored right column: straight on the right edge, uneven toward the center
- Second voices and background vocals stay on screen and inside their column
- Keeps Spicy Lyrics' background without the video, blending the colors of both songs
- Corrects the incoming song's clock during the mix, so its lyrics don't lag and then jump
- **Follows loops:** when the transition loops the outgoing song, its lyrics loop with it, and hold on the beat instead of flashing the next line
- **Up next:** a few seconds before a mix starts, the first line you'll hear from the incoming song rises in at the bottom
- **Reacts to the mix effects:** the lyrics blur when the filter muffles the song, wash out when the bass is cut, leave echo trails and a reverb halo, pulse with the bass on each song's own beat, and fade with each song's real volume
- Stacks the two songs on narrow windows

## Requirements

- [Spicetify](https://spicetify.app)
- [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics), installed separately
- A playlist with transitions made in Spotify's mix editor

Mix Lyrics doesn't need any particular theme. With [Vitral](https://github.com/SrPictus/vitral), both songs take its font, background and blue karaoke glow.

## Install

### Marketplace (recommended)

Open the **Marketplace** in Spotify, go to the **Extensions** tab, search for **Mix Lyrics** and click **Install**. It updates on its own.

### Manual, on Windows

In PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/SrPictus/mix-lyrics/main/mix-lyrics.js" -OutFile "$env:APPDATA\spicetify\Extensions\mix-lyrics.js"
```

```powershell
spicetify config extensions mix-lyrics.js
```

```powershell
spicetify apply
```

### Manual, on macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/SrPictus/mix-lyrics/main/mix-lyrics.js -o ~/.config/spicetify/Extensions/mix-lyrics.js
```

```bash
spicetify config extensions mix-lyrics.js
```

```bash
spicetify apply
```

### Uninstall

From the Marketplace, click **Uninstall** on Mix Lyrics. If you installed it by hand:

```bash
spicetify config extensions mix-lyrics.js-
```

```bash
spicetify apply
```

## Known limits

- Tested on Windows in Spicy Lyrics' medium and fullscreen views. The stacked layout for narrow windows and songs without a video are not tested yet.
- It relies on internals of Spotify and Spicy Lyrics, so an update to either one can break it.
- While a mix plays it temporarily changes the playback position Spotify reports to other extensions.

## How it works

The outgoing song's lyrics come from the copy Spicy Lyrics already saved on your computer, with Spotify's own lyrics as a fallback. Mix Lyrics contains no lyrics and sends nothing to any other server.

## Credits

Lyrics display by [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) by Spikerko. Mix Lyrics is an independent project, not affiliated with Spicy Lyrics or Spotify.

## License

[AGPL-3.0](LICENSE)
