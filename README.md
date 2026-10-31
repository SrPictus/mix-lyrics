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
- Stacks the two songs on narrow windows

## Requirements

- [Spicetify](https://spicetify.app)
- [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics), installed separately
- A playlist with transitions made in Spotify's mix editor

## Install

From the Spicetify Marketplace: search for **Mix Lyrics** in the Extensions tab and install it.

Or by hand:

1. Copy `mix-lyrics.js` to the Spicetify `Extensions` folder (`%appdata%\spicetify\Extensions` on Windows, `~/.config/spicetify/Extensions` on macOS and Linux).
2. Run:

```bash
spicetify config extensions mix-lyrics.js
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
