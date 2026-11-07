// Mix Lyrics: en las listas mixeadas de Spotify, la pantalla de Spicy Lyrics se parte en dos durante
// la transición: la canción que sale canta a la izquierda y la que entra, en espejo, a la derecha
(function mixLyrics() {
  const P = Spicetify?.Platform;
  if (!Spicetify?.Player?.origin || !Spicetify.Player.data || !Spicetify.CosmosAsync || !P?.PlaylistMixingAPI) {
    setTimeout(mixLyrics, 300);
    return;
  }

  const SPICY_CACHE = "SpicyLyrics_LyricsStore_g1";
  const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FADE_MS = 1500;
  const FRAME_MS = 33;
  const COLUMNS_MIN_WIDTH = 800;
  const COLUMN_MARGIN = 0.065;
  const COLUMN_GAP = 40;
  // Margen tras la última línea de la canción que sale antes de devolverle la pantalla a la nueva
  const RELEASE_AFTER_LAST_LINE_MS = 1000;
  // Spicy Lyrics adelanta su reloj esto mismo para compensar el retardo del audio
  const AUDIO_LEAD_MS = 100;
  const NEW_LYRICS = ".ContentBox > .LyricsContainer:not(.ml-outgoing)";

  const style = document.createElement("style");
  style.textContent = `
    #SpicyLyricsPage ${NEW_LYRICS} {
      transition: transform 0.7s cubic-bezier(.22,1,.36,1);
    }
    #SpicyLyricsPage.ml-mixing ${NEW_LYRICS} {
      position: relative;
      z-index: 2;
      transition: none;
    }
    /* Hasta saber dónde va, la letra nueva no se enseña: así nunca aparece fuera de su sitio */
    #SpicyLyricsPage.ml-columns:not(.ml-aligned) ${NEW_LYRICS} {
      opacity: 0 !important;
    }
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} {
      transform: translateX(var(--ml-shift, 50%));
    }
    /* La columna derecha es un espejo: recta por la derecha y desigual hacia el centro */
    /* El relleno izquierdo mantiene la letra dentro de su mitad en las vistas medianas. Las líneas no
       reaccionan al ratón: su recuadro al pasar por encima ocuparía también la otra columna */
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} .line {
      box-sizing: border-box;
      padding-left: var(--ml-pad-left, 0) !important;
      pointer-events: none;
    }
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} .line:not(.OppositeAligned) {
      padding-right: var(--ml-pad, 0) !important;
      text-align: right !important;
      justify-content: flex-end !important;
      transform-origin: right center;
    }
    /* La segunda voz también va en espejo: hacia el centro, con el mismo ancho para que no cambie de filas */
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} .line.OppositeAligned {
      padding-right: var(--ml-pad, 0) !important;
      text-align: left !important;
      justify-content: flex-start !important;
      transform-origin: left center;
    }
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} .line.OppositeAligned .word-group {
      justify-content: flex-start !important;
    }
    /* Como hace Spicy Lyrics con sus líneas a la derecha: un hueco entre palabras en vez de un espacio
       pegado a cada una, para que las filas partidas también acaben rectas */
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} .line:not(.OppositeAligned) {
      column-gap: 0.32ch;
    }
    #SpicyLyricsPage.ml-columns ${NEW_LYRICS} .line:not(.OppositeAligned) .word::after {
      margin-right: 0 !important;
    }
    /* La letra se desvanece antes de llegar a la píldora */
    #SpicyLyricsPage.ml-columns .LyricsContainer .LyricsContent {
      -webkit-mask-image: linear-gradient(transparent 16px, #000 64px, #000 calc(100% - 128px), transparent calc(100% - 76px)) !important;
    }
    #SpicyLyricsPage.ml-stacked ${NEW_LYRICS} {
      transform: translateY(44%);
    }
    #SpicyLyricsPage.ml-mixing .NowBar,
    #SpicyLyricsPage.ml-mixing .CanvasStage {
      opacity: 0 !important;
      transition: opacity 0.6s ease;
    }

    /* El fondo es el de Spicy Lyrics con la canción que entra; encima, los colores de la que sale, solo en su lado */
    .ml-backdrop {
      position: absolute;
      inset: 0;
      z-index: 1;
      overflow: hidden;
      pointer-events: none;
    }
    .ml-backdrop canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      -webkit-mask-image: linear-gradient(90deg, #000 36%, transparent 68%);
    }
    .ml-stacked .ml-backdrop canvas { -webkit-mask-image: linear-gradient(180deg, #000 30%, transparent 60%); }

    #SpicyLyricsPage .ContentBox > .LyricsContainer.ml-outgoing {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      overflow: hidden;
      pointer-events: none;
      transform: none;
    }
    #SpicyLyricsPage.ml-columns .LyricsContainer.ml-outgoing { width: 50%; height: 100%; }
    #SpicyLyricsPage.ml-stacked .LyricsContainer.ml-outgoing { width: 100%; height: 44%; }
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .LyricsContent {
      height: 100%;
      overflow: hidden;
    }
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .SpicyLyricsScrollContainer {
      margin: 0 !important;
      padding-top: 0 !important;
      will-change: transform;
      transition: transform 0.45s cubic-bezier(.22,1,.36,1);
    }
    /* El tamaño de Spicy Lyrics depende de su contenedor, que aquí es otro: se copia lo que tiene la letra nueva */
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .line {
      --DefaultLyricsSize: var(--ml-font, 3rem) !important;
      margin: var(--ml-gap, 0.35em) 0 0 !important;
      column-gap: 0.32ch;
    }
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .line.bg-line {
      margin-top: var(--ml-gap-bg, 0px) !important;
    }
    /* El mismo hueco entre palabras que la columna derecha */
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .line .word::after {
      margin-right: 0 !important;
    }
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .line:not(.bg-line) {
      font-size: var(--ml-font, 3rem) !important;
    }
    #SpicyLyricsPage .LyricsContainer.ml-outgoing .line.bg-line {
      font-size: var(--ml-font-bg, calc(var(--ml-font, 3rem) * 0.7)) !important;
    }

    .ml-fader {
      position: absolute;
      left: 50%;
      bottom: 28px;
      z-index: 3;
      display: flex;
      align-items: center;
      gap: 14px;
      width: min(620px, 70%);
      padding: 9px 18px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      pointer-events: none;
      transform: translateX(-50%);
      animation: ml-fade-in 0.5s ease;
    }
    #SpicyLyricsPage.ml-stacked .ml-fader {
      top: 44%;
      bottom: auto;
      width: calc(100% - 24px);
      padding: 6px 12px;
      font-size: 11px;
      transform: translate(-50%, -50%);
    }
    .ml-fader span {
      flex: 1 1 0;
      overflow: hidden;
      min-width: 0;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ml-fader span:last-child { text-align: right; }
    .ml-fader div {
      position: relative;
      flex: 0 0 34%;
      height: 3px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.28);
    }
    .ml-fader i {
      position: absolute;
      top: -5px;
      left: 0;
      width: 13px;
      height: 13px;
      margin-left: -6px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
    }
    @keyframes ml-fade-in {
      from { opacity: 0; }
    }

    /* Antes de la mezcla, la primera línea que se oirá de la canción que entra asoma desde abajo */
    .ml-teaser {
      position: absolute;
      left: 50%;
      bottom: 28px;
      /* Por encima de las líneas de Spicy Lyrics, que tienen su propia capa */
      z-index: 20;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      max-width: min(760px, 86%);
      padding: 12px 26px 14px;
      border-radius: 22px;
      background: rgba(6, 8, 16, 0.82);
      -webkit-backdrop-filter: blur(16px);
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
      color: #fff;
      text-align: center;
      pointer-events: none;
      transform: translate(-50%, 24px);
      opacity: 0;
      filter: blur(8px);
      transition: transform 0.9s cubic-bezier(.22,1,.36,1), opacity 0.9s ease, filter 0.9s ease;
    }
    .ml-teaser.is-on {
      transform: translate(-50%, 0);
      opacity: 1;
      filter: none;
    }
    .ml-teaser small {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.7;
    }
    .ml-teaser small img {
      width: 20px;
      height: 20px;
      border-radius: 4px;
    }
    .ml-teaser p {
      margin: 0;
      font-size: clamp(18px, 2.3vw, 30px);
      font-weight: 700;
      line-height: 1.2;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
    }
    .ml-teaser p span {
      display: inline-block;
      margin-right: 0.28ch;
      opacity: 0;
      transform: translateY(0.5em);
      transition: opacity 0.6s ease, transform 0.6s cubic-bezier(.22,1,.36,1);
      transition-delay: calc(var(--i) * 70ms + 250ms);
    }
    .ml-teaser.is-on p span {
      opacity: 0.85;
      transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
      #SpicyLyricsPage ${NEW_LYRICS},
      #SpicyLyricsPage .LyricsContainer.ml-outgoing .SpicyLyricsScrollContainer { transition: none; }
      .ml-fader { animation: none; }
      .ml-teaser, .ml-teaser p span { transition: opacity 0.3s ease; transform: translate(-50%, 0); filter: none; }
      .ml-teaser p span { transform: none; }
    }
  `;
  document.head.append(style);

  // Pasa la letra a un solo formato: líneas con palabras y tiempos en milisegundos
  function normalizeSpicy(content) {
    const lines = [];
    const syllableLine = (part, opposite, background) => ({
      start: part.StartTime * 1000,
      end: part.EndTime * 1000,
      opposite,
      background,
      words: part.Syllables.map((s) => ({ text: s.Text, start: s.StartTime * 1000, end: s.EndTime * 1000, joined: !!s.IsPartOfWord })),
    });
    for (const item of content?.Content ?? []) {
      if (item.Lead?.Syllables?.length) {
        lines.push(syllableLine(item.Lead, !!item.OppositeAligned, false));
        // Los coros y la voz de fondo van en su propia línea, igual que en Spicy Lyrics
        for (const part of item.Background ?? []) {
          if (part.Syllables?.length) lines.push(syllableLine(part, !!item.OppositeAligned, true));
        }
      } else if (typeof item.Text === "string") {
        const start = item.StartTime * 1000, end = item.EndTime * 1000;
        lines.push({ start, end, opposite: !!item.OppositeAligned, words: [{ text: item.Text, start, end, joined: false }] });
      }
    }
    return lines;
  }

  function normalizeSpotify(result) {
    if (result?.lyrics?.syncType === "UNSYNCED") return [];
    const raw = result?.lyrics?.lines ?? [];
    return raw.map((line, i) => {
      const start = Number(line.startTimeMs);
      const end = Number(raw[i + 1]?.startTimeMs ?? start + 4000);
      return { start, end, opposite: false, words: [{ text: line.words, start, end, joined: false }] };
    }).filter((line) => line.words[0].text?.trim());
  }

  // Primero la letra que Spicy Lyrics ya guardó en este PC, sin pedir nada a su servidor
  async function loadLyrics(uri) {
    const id = uri.split(":").pop();
    try {
      const cache = await caches.open(SPICY_CACHE);
      const hit = await cache.match(`/${id}`);
      const lines = hit ? normalizeSpicy((await hit.json()).Content) : [];
      if (lines.length) return lines;
    } catch {}
    try {
      return normalizeSpotify(await Spicetify.CosmosAsync.get(`https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}?format=json&market=from_token`));
    } catch {
      return [];
    }
  }

  function coverUrl(item) {
    const image = item?.metadata?.image_small_url ?? item?.metadata?.image_url;
    return image?.startsWith("spotify:image:") ? `https://i.scdn.co/image/${image.split(":").pop()}` : image ?? null;
  }

  // La carátula se pinta difuminada una sola vez en un lienzo mínimo: nada de desenfoque en vivo
  async function paintCover(canvas, url) {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    try {
      await img.decode();
    } catch {
      return;
    }
    canvas.width = canvas.height = 48;
    const ctx = canvas.getContext("2d");
    ctx.filter = "blur(5px) saturate(2.5) brightness(0.65)";
    ctx.drawImage(img, -6, -6, 60, 60);
  }

  // Lo que la persona tiene configurado en Spicy Lyrics se lee de su propia letra: tamaño, espacio
  // entre líneas y clases como la que quita el desenfoque
  let spicyLook = null;
  let gapCache = null;

  // Spicy Lyrics separa sus líneas sin usar margen, así que se mide la distancia real entre ellas.
  // Basta una vez por tamaño de letra: mientras la letra se desplaza la distancia varía un momento
  function readGaps(lyrics, key) {
    if (gapCache?.key === key) return gapCache;
    const between = (selector) => {
      const gaps = [];
      for (const line of lyrics.querySelectorAll(selector)) {
        const previous = line.previousElementSibling;
        if (!previous?.classList.contains("line") || previous.classList.contains("bg-line") || previous.classList.contains("musical-line")) continue;
        const gap = line.getBoundingClientRect().top - previous.getBoundingClientRect().bottom;
        if (gap >= 0 && gap < 200) gaps.push(gap);
        if (gaps.length >= 9) break;
      }
      return gaps.length ? `${gaps.sort((a, b) => a - b)[gaps.length >> 1].toFixed(1)}px` : null;
    };
    const gap = between(".line:not(.bg-line):not(.musical-line)");
    if (!gap) return { gap: null, gapBackground: null };
    gapCache = { key, gap, gapBackground: between(".line.bg-line") };
    return gapCache;
  }

  function readLook(page) {
    const lyrics = page.querySelector(".ContentBox > .LyricsContainer:not(.ml-outgoing)");
    const line = lyrics?.querySelector(".line:not(.musical-line):not(.bg-line)");
    const word = line?.querySelector(".word");
    if (!word) return null;
    const background = lyrics.querySelector(".line.bg-line .word");
    // Solo las clases de ajustes: las demás son estados pasajeros, como la que oculta la letra mientras carga
    const extras = [...lyrics.querySelector(".LyricsContent").classList].filter((name) => /^(HideLineBlur|Compactify)/.test(name));
    const font = getComputedStyle(word).fontSize;
    const { gap, gapBackground } = readGaps(lyrics, `${page.clientWidth}|${font}`);
    return {
      width: page.clientWidth,
      font,
      fontBackground: background ? getComputedStyle(background).fontSize : null,
      gap,
      gapBackground,
      classes: ["LyricsContent", ...extras].join(" "),
    };
  }

  function applyLook(box, content, look) {
    box.style.setProperty("--ml-font", look.font);
    if (look.gap) box.style.setProperty("--ml-gap", look.gap);
    if (look.gapBackground) box.style.setProperty("--ml-gap-bg", look.gapBackground);
    if (look.fontBackground) box.style.setProperty("--ml-font-bg", look.fontBackground);
    if (content.className !== look.classes) content.className = look.classes;
  }

  // Copia cada segundo el fondo que Spicy Lyrics saca del video, para conservar el de la canción que sale
  let ambientShot = null;

  // Las mezclas empiezan cerca del final de la canción: antes de eso no hace falta copiar nada
  const SNAPSHOT_BEFORE_END_MS = 120000;

  function snapshotAmbient() {
    if (document.hidden || active) return;
    const data = Spicetify.Player.data;
    if (!data?.context?.uri?.startsWith("spotify:playlist:")) return;
    if (Spicetify.Player.getDuration() - Spicetify.Player.getProgress() > SNAPSHOT_BEFORE_END_MS) return;
    const spicyPage = document.querySelector("#SpicyLyricsPage");
    if (!spicyPage) return;
    spicyLook = readLook(spicyPage) ?? spicyLook;
    const ambient = document.querySelector("#SpicyLyricsPage .CanvasAmbient");
    const coverBackground = document.querySelector("#SpicyLyricsPage .spicy-dynamic-bg");
    if (!ambient?.width || (coverBackground && +getComputedStyle(coverBackground).opacity > 0.5)) {
      ambientShot = null;
      return;
    }
    ambientShot ??= document.createElement("canvas");
    ambientShot.width = ambient.width;
    ambientShot.height = ambient.height;
    ambientShot.getContext("2d").drawImage(ambient, 0, 0);
  }

  setInterval(snapshotAmbient, 1000);

  function buildLine(line) {
    const el = document.createElement("div");
    el.className = "line NotSung";
    el.dir = "auto";
    if (line.opposite) el.classList.add("OppositeAligned");
    if (line.background) el.classList.add("bg-line");
    const spans = [];
    let group = null;
    line.words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word.text;
      const previousJoined = i > 0 && line.words[i - 1].joined;
      if (word.joined) span.classList.add("PartOfWord");
      if (i === line.words.length - 1) span.classList.add("LastWordInLine");
      if (word.joined || previousJoined) {
        if (!group) {
          group = document.createElement("span");
          group.className = "word-group";
          el.append(group);
        }
        group.append(span);
        if (!word.joined) group = null;
      } else {
        el.append(span);
      }
      spans.push({ span, word, progress: -1 });
    });
    return { el, spans, line, state: "NotSung", blur: -1 };
  }

  function paintWord(entry, position) {
    const { start, end } = entry.word;
    const progress = position <= start ? 0 : position >= end ? 1 : (position - start) / Math.max(1, end - start);
    if (Math.abs(progress - entry.progress) < 0.004) return;
    entry.progress = progress;
    const s = entry.span.style;
    s.setProperty("--gradient-position", `${(-20 + 140 * progress).toFixed(1)}%`);
    s.setProperty("--text-shadow-opacity", `${(progress > 0 && progress < 1 ? 45 : 0)}%`);
    s.setProperty("--text-shadow-blur-radius", "4px");
    s.scale = (0.95 + 0.05 * progress).toFixed(3);
    s.transform = `translateY(calc(var(--DefaultLyricsSize) * ${(0.01 - 0.03 * progress).toFixed(3)}))`;
  }

  const setOpacity = (el, value) => {
    const rounded = Math.round(value * 100) / 100;
    if (el && parseFloat(el.style.opacity) !== rounded) el.style.opacity = rounded;
  };

  const smooth = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

  // Durante la mezcla Spotify informa la posición de la canción nueva a velocidad normal aunque
  // el audio vaya acelerado o frenado, y al terminar la corrige de golpe, así que Spicy Lyrics se
  // desfasa y luego salta. Mientras dura la mezcla, quien lea el estado recibe la posición real del audio
  const playerAPI = P.PlayerAPI;
  let rawState = null;
  let clockPatched = false;
  // Cuando Spotify ya publicó la posición real, su reloj vale tal cual. El desfase mantiene seguido
  // el tiempo de la mezcla a pesar de ese salto
  let clockPublished = false;
  let clockSeeked = false;
  let clockSkew = 0;

  const positionOf = (state) => (state.isPaused ? state.positionAsOfTimestamp : state.positionAsOfTimestamp + (Date.now() - state.timestamp));

  const rawPosition = () => {
    const state = clockPatched ? rawState : playerAPI._state;
    if (!state) return Spicetify.Player.getProgress();
    return positionOf(state) + clockSkew;
  };

  const realPosition = (overlap, elapsed) => {
    const inside = Math.min(elapsed, overlap.durationMs);
    return overlap.startBMs + inside * overlap.speedB + (elapsed - inside);
  };

  function patchClock(overlap, nextUri) {
    const descriptor = Object.getOwnPropertyDescriptor(playerAPI, "_state");
    if (clockPatched || !descriptor || !("value" in descriptor) || !descriptor.configurable) return;
    if (Math.abs(overlap.speedB - 1) < 0.001) return;
    rawState = descriptor.value;
    clockPatched = true;
    clockPublished = false;
    clockSeeked = false;
    clockSkew = 0;
    Object.defineProperty(playerAPI, "_state", {
      configurable: true,
      enumerable: descriptor.enumerable,
      set(value) {
        if (!clockPublished && rawState?.item?.uri === nextUri && value?.item?.uri === nextUri) {
          const before = positionOf(rawState);
          const after = positionOf(value);
          const jump = Math.abs(after - before);
          const elapsed = before - overlap.startBMs;
          // Un salto grande o cerca del final: o Spotify publica la posición real, o el usuario movió la barra
          if (jump > 1500 || (jump > 250 && elapsed > overlap.durationMs * 0.5)) {
            clockPublished = true;
            clockSkew = before - after;
            clockSeeked = Math.abs(after - realPosition(overlap, elapsed)) > 1500;
          }
        }
        rawState = value;
      },
      get() {
        if (clockPublished || !rawState || rawState.item?.uri !== nextUri) return rawState;
        const elapsed = positionOf(rawState) - overlap.startBMs;
        if (elapsed < 0) return rawState;
        return { ...rawState, positionAsOfTimestamp: realPosition(overlap, elapsed), timestamp: Date.now() };
      },
    });
  }

  function restoreClock() {
    clockSkew = 0;
    clockSeeked = false;
    if (!clockPatched) return;
    clockPatched = false;
    Object.defineProperty(playerAPI, "_state", { configurable: true, enumerable: true, writable: true, value: rawState });
    rawState = null;
  }

  let current = null;
  let session = 0;
  let active = null;
  let view = null;
  let loop = 0;

  function unmount() {
    if (!view) return;
    const { page, box, fader, backdrop, original } = view;
    page.classList.remove("ml-mixing", "ml-columns", "ml-stacked", "ml-aligned");
    original?.style.removeProperty("opacity");
    original?.style.removeProperty("filter");
    original?.style.removeProperty("scale");
    ["--ml-shift", "--ml-pad", "--ml-pad-left"].forEach((name) => page.style.removeProperty(name));
    box.remove();
    fader.remove();
    backdrop.remove();
    view = null;
  }

  function closeSplit() {
    cancelAnimationFrame(loop);
    active = null;
    restoreClock();
    unmount();
  }

  // Spicy Lyrics crea otra página al cambiar entre panel y pantalla completa: se vuelve a montar ahí
  function mount(page) {
    unmount();
    const { lines, fromName, toName, fromCover, fromAmbient } = active;
    const rows = lines.map(buildLine);
    if (!rows.length) return;

    const contentBox = page.querySelector(".ContentBox");
    const original = contentBox.querySelector(":scope > .LyricsContainer:not(.ml-outgoing)");
    const originalRect = original?.getBoundingClientRect();
    const sampleRect = original?.querySelector(".line")?.getBoundingClientRect();
    const gutter = sampleRect && originalRect ? Math.max(0, sampleRect.left - originalRect.left) : 32;
    const isColumns = page.clientWidth >= COLUMNS_MIN_WIDTH;

    page.classList.add("ml-mixing", isColumns ? "ml-columns" : "ml-stacked");

    const backdrop = document.createElement("div");
    backdrop.className = "ml-backdrop";
    const backOut = document.createElement("canvas");
    backdrop.append(backOut);
    if (fromAmbient) {
      backOut.width = fromAmbient.width;
      backOut.height = fromAmbient.height;
      backOut.getContext("2d").drawImage(fromAmbient, 0, 0);
    } else {
      paintCover(backOut, fromCover);
    }
    contentBox.append(backdrop);

    const box = document.createElement("div");
    box.className = "LyricsContainer ml-outgoing";
    box.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "LyricsContent";
    const scroller = document.createElement("div");
    scroller.className = "SpicyLyricsScrollContainer";
    // Sin esto Spicy Lyrics pinta también la línea entera debajo de las palabras y la letra se ve doble
    scroller.dataset.lyricsType = "Syllable";
    scroller.style.paddingInline = `${Math.round(gutter)}px`;
    rows.forEach((row) => scroller.append(row.el));
    content.append(scroller);
    box.append(content);
    if (spicyLook?.width === page.clientWidth) applyLook(box, content, spicyLook);
    // Después de la original: así Spicy Lyrics sigue encontrando su propio contenedor primero
    contentBox.append(box);

    const fader = document.createElement("div");
    fader.className = "ml-fader";
    fader.setAttribute("aria-hidden", "true");
    const leftName = document.createElement("span");
    leftName.textContent = fromName;
    const rail = document.createElement("div");
    const knob = document.createElement("i");
    rail.append(knob);
    const rightName = document.createElement("span");
    rightName.textContent = toName;
    fader.append(leftName, rail, rightName);
    contentBox.append(fader);

    view = { page, box, content, scroller, rows, fader, knob, rail, original, backdrop, backOut, gutter, focused: -1, aimY: null, alignedAt: 0 };
  }

  // Las dos columnas quedan a la misma distancia de su borde: la que usa la letra de Spicy Lyrics.
  // Spicy Lyrics cambia el tamaño de su letra al entrar la canción y al cambiar de vista, así que se repite.
  // Se mide en una línea cantada: las de solo música no llevan el relleno derecho de las demás
  function alignEdges() {
    const { page, original, scroller, box, content } = view;
    const look = readLook(page);
    if (look && JSON.stringify(look) !== JSON.stringify(view.look)) {
      view.look = look;
      spicyLook = look;
      applyLook(box, content, look);
    }
    const typical = original?.querySelector(".line:not(.musical-line):not(.bg-line):not(.OppositeAligned)");
    const pageWidth = page.clientWidth;
    const pageLeft = page.getBoundingClientRect().left;
    const moved = original ? new DOMMatrix(getComputedStyle(original).transform).m41 : 0;
    const base = typical ? typical.getBoundingClientRect().left - pageLeft - moved : Infinity;
    // En las vistas medianas Spicy Lyrics centra la letra con mucho margen: ahí se reduce para que quepan dos columnas.
    // La letra nueva puede tardar en montarse, pero la columna izquierda se coloca desde el primer momento
    const margin = Math.min(base, pageWidth * COLUMN_MARGIN);
    view.gutter = Math.max(0, margin - (scroller.getBoundingClientRect().left - pageLeft));
    scroller.style.paddingLeft = `${Math.round(view.gutter)}px`;
    scroller.style.paddingRight = `${COLUMN_GAP}px`;
    if (!typical) return;
    const padding = parseFloat(getComputedStyle(typical).paddingRight);
    const textWidth = typical.offsetWidth - padding;
    const columnWidth = pageWidth / 2 - margin - COLUMN_GAP;
    const shift = Math.round(Math.max(0, pageWidth - margin - base - textWidth));
    if (shift !== view.shift) {
      view.shift = shift;
      page.style.setProperty("--ml-shift", `${shift}px`);
    }
    // Una variable en la página recalcula los estilos de toda la letra: solo se toca si cambia
    const padLeft = Math.round(Math.max(0, textWidth - columnWidth));
    if (padding !== view.padding || padLeft !== view.padLeft) {
      view.padding = padding;
      view.padLeft = padLeft;
      page.style.setProperty("--ml-pad", `${padding}px`);
      page.style.setProperty("--ml-pad-left", `${padLeft}px`);
    }
    page.classList.add("ml-aligned");
  }

  function paint(position, elapsed, now) {
    const { page, box, scroller, rows, knob, rail, original, backOut } = view;
    const mix = elapsed / active.releaseAt;

    let target = 0;
    rows.forEach((row, i) => {
      if (!row.line.background && row.line.start <= position) target = i;
      const state = position > row.line.end ? "Sung" : position >= row.line.start ? "Active" : "NotSung";
      if (state !== row.state) {
        row.el.classList.replace(row.state, state);
        row.state = state;
      }
      if (state === "Active") {
        row.spans.forEach((entry) => paintWord(entry, position));
        row.resting = false;
      } else if (!row.resting) {
        // Como en Spicy Lyrics, las líneas cantadas vuelven al estado apagado de las que faltan
        row.spans.forEach((entry) => paintWord(entry, -Infinity));
        row.resting = true;
      }
    });

    // Las líneas activas de las dos canciones quedan a la misma altura
    const isColumns = page.classList.contains("ml-columns");
    // Mientras la letra nueva no tenga su sitio se mira en cada cuadro, no cada 400 ms
    if (isColumns && !page.classList.contains("ml-aligned")) alignEdges();
    if (now - view.alignedAt > 400 || target !== view.focused) {
      // La ventana pudo cambiar de tamaño sin que Spicy Lyrics cree otra página
      if ((page.clientWidth >= COLUMNS_MIN_WIDTH) !== isColumns) {
        mount(page);
        return;
      }
      view.alignedAt = now;
      view.railWidth = rail.clientWidth;
      let aim = box.clientHeight * 0.34;
      if (isColumns) {
        alignEdges();
        const live = original?.querySelector(".line.Active");
        if (live) aim = live.getBoundingClientRect().top - box.getBoundingClientRect().top;
        else if (view.aimY !== null) aim = view.aimY;
        // Al cambiar de vista la letra nueva pasa un momento fuera de pantalla: no se la sigue hasta allí
        aim = Math.min(box.clientHeight * 0.7, Math.max(box.clientHeight * 0.1, aim));
      }
      if (target !== view.focused || view.aimY === null || Math.abs(aim - view.aimY) > 6) {
        // El mismo desenfoque por distancia que Spicy Lyrics pone a sus líneas
        rows.forEach((row, i) => {
          const blur = Math.min(Math.abs(i - target) * 1.25, 6.83);
          if (blur !== row.blur) {
            row.blur = blur;
            row.el.style.setProperty("--BlurAmount", `${blur}px`);
          }
        });
        // Recién montada va directa a su línea, sin recorrer la canción desde el principio
        const first = view.focused === -1;
        if (first) scroller.style.transition = "none";
        view.focused = target;
        view.aimY = aim;
        scroller.style.transform = `translateY(${Math.round(aim - rows[target].el.offsetTop)}px)`;
        if (first) {
          void scroller.offsetHeight;
          scroller.style.transition = "";
        }
      }
    }

    // Una se apaga mientras la otra se enciende, en la letra y en el fondo
    const lastFade = Math.min(1, (active.releaseAt - elapsed) / FADE_MS);
    const leaving = smooth((mix - 0.45) / 0.55);
    const entering = smooth(mix / 0.55);
    const { overlap, effects, blocks } = active;
    const t = Math.min(1, elapsed / overlap.durationMs);
    const lookOut = lookOf(effects?.out, t, -1);
    const lookIn = lookOf(effects?.in, t, isColumns ? 1 : -1);
    // Si la mezcla trae su curva de volumen, cada columna brilla según suena de verdad su canción
    setOpacity(original, lookIn.volume === null ? 0.4 + 0.6 * entering : 0.4 + 0.6 * lookIn.volume);
    setOpacity(box, (lookOut.volume === null ? 1 - 0.55 * leaving : 0.3 + 0.7 * lookOut.volume) * lastFade);
    setStyle(view.content, "filter", lookOut.filter);
    setStyle(original, "filter", lookIn.filter);
    if (!REDUCED_MOTION) {
      const inLoop = blocks.some((block) => t >= block.start && t < block.end);
      const pulseOut = beatPulse(position, overlap.startAMs, overlap.bpmA) * lookOut.bass * (inLoop ? 0.03 : 0.012);
      const incoming = overlap.startBMs + elapsed * (overlap.speedB || 1);
      const pulseIn = beatPulse(incoming, overlap.startBMs, overlap.bpmB) * lookIn.bass * 0.012;
      setStyle(view.content, "scale", (1 + pulseOut).toFixed(3));
      setStyle(original, "scale", (1 + pulseIn).toFixed(3));
    }
    setOpacity(backOut, 1 - smooth(mix));
    knob.style.transform = `translateX(${(Math.min(1, mix) * view.railWidth).toFixed(1)}px)`;
  }

  // Efectos de la mezcla. Spotify los guarda como curvas: tramos con su inicio y final en fracción de la
  // mezcla y puntos {x, y} dentro de cada tramo. Una transición puede traer sus propias curvas o usar las de un estilo
  function curveAt(curve, t) {
    const parts = curve?.curves;
    if (!parts?.length) return null;
    const part = parts.find((p) => t >= p.start && t < p.end) ?? (t < parts[0].start ? parts[0] : parts[parts.length - 1]);
    const points = part.points ?? [];
    if (!points.length) return null;
    const x = part.end > part.start ? Math.min(1, Math.max(0, (t - part.start) / (part.end - part.start))) : 1;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (x <= b.x) return b.x > a.x ? a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) : b.y;
    }
    return points[points.length - 1].y;
  }

  async function effectsOf(preset) {
    if (!preset) return null;
    const api = P.PlaylistMixingAPI;
    const style = async (method, id, list) => {
      if (!id || typeof api[method] !== "function") return null;
      try {
        return (await api[method]([id]))?.[list]?.find((entry) => entry.style?.id === id) ?? null;
      } catch {
        return null;
      }
    };
    const [volume, eq, filter, fx] = await Promise.all([
      style("getVolumeStylesForVolumeStyleIds", preset.volumeStyleOverride?.id, "volumeStyles"),
      style("getEqStylesForEqStyleIds", preset.eqStyleOverride?.id, "eqStyles"),
      style("getFilterFxStylesForFilterFxStyleIds", preset.filterFxStyleOverride?.id, "filterFxStyles"),
      style("getFxStylesForFxStyleIds", preset.fxStyleOverride?.id, "fxStyles"),
    ]);
    // Lo propio de la transición manda sobre el estilo
    const pick = (own, fromStyle) => (own?.curves?.length ? own : fromStyle?.curves?.length ? fromStyle : null);
    const side = (dir) => ({
      volume: pick(preset[`volume${dir}CurveOverride`], volume?.[`fade${dir}Curves`]),
      low: pick(preset[`eq${dir}CurveOverrides`]?.low, eq?.[`lowEq${dir}Curves`]),
      cutoff: pick(preset[`filter${dir}CurveOverrides`]?.cutoff, filter?.[`filterCutoff${dir}Curves`]),
      reverb: pick(preset[`fx${dir}CurveOverrides`]?.reverbDryWet, fx?.[`reverbDryWet${dir}Curves`]),
      echo: pick(preset[`fx${dir}CurveOverrides`]?.echoDryWet, fx?.[`echoDryWet${dir}Curves`]),
    });
    return { out: side("Out"), in: side("In") };
  }

  // Cómo se ve cada efecto en la letra: el filtro que apaga el sonido la desenfoca, el que quita los graves
  // la vuelve fina y clara, el eco deja copias detrás y la reverb un halo. Los graves marcan el latido
  function lookOf(side, t, echoDirection) {
    const value = (curve, neutral) => curveAt(curve, t) ?? neutral;
    const cutoff = value(side?.cutoff, 0.5);
    const echo = value(side?.echo, 0);
    const reverb = value(side?.reverb, 0);
    const parts = [];
    if (cutoff < 0.48) parts.push(`blur(${((0.5 - cutoff) * 10).toFixed(1)}px)`);
    if (cutoff > 0.52) {
      const k = (cutoff - 0.5) * 2;
      parts.push(`saturate(${(1 - 0.8 * k).toFixed(2)}) brightness(${(1 + 0.35 * k).toFixed(2)})`);
    }
    if (echo > 0.02) {
      parts.push(`drop-shadow(${(echoDirection * 0.22 * echo).toFixed(3)}em 0 0 rgba(255,255,255,${(0.4 * echo).toFixed(2)}))`);
      parts.push(`drop-shadow(${(echoDirection * 0.22 * echo).toFixed(3)}em 0 0 rgba(255,255,255,${(0.2 * echo).toFixed(2)}))`);
    }
    if (reverb > 0.02) parts.push(`drop-shadow(0 0 ${Math.round(26 * reverb)}px rgba(255,255,255,${(0.45 * reverb).toFixed(2)}))`);
    return { filter: parts.join(" "), volume: curveAt(side?.volume, t), bass: value(side?.low, 0.5) * 2 };
  }

  // El latido: un golpe que decae en cada beat de su propia canción
  function beatPulse(position, anchor, bpm) {
    const beatMs = 60000 / (bpm || 120);
    const phase = ((((position - anchor) % beatMs) + beatMs) % beatMs) / beatMs;
    return Math.exp(-phase * 5);
  }

  const setStyle = (el, name, value) => {
    if (el && el.style[name] !== value) el.style[name] = value;
  };

  // Los loops de la transición: cada bloque repite unos beats de la canción que sale durante
  // una parte de la mezcla (start/end son fracciones de la mezcla)
  async function loopBlocksOf(preset) {
    const custom = preset?.loopingOutBlocksOverride?.blocks;
    if (Array.isArray(custom) && custom.length) return custom;
    const id = preset?.loopingStyleOverride?.id;
    if (!id) return [];
    try {
      const found = await P.PlaylistMixingAPI.getLoopingBlocksForLoopingStyleIds([id]);
      return found?.loopingStyleBlocks?.find((entry) => entry.style?.id === id)?.out?.blocks ?? [];
    } catch {
      return [];
    }
  }

  // Dónde va la canción que sale tras `elapsed` ms de mezcla. Dentro de un loop la posición vuelve
  // atrás cada N beats; al salir del loop sigue desde donde quedó
  // Si el loop solo roza el comienzo de una línea al final de cada vuelta, la letra se queda antes
  // (en el ritmo, con las bolitas) en lugar de asomar esa línea y volver atrás cada vez
  const LOOP_LINE_MIN_MS = 900;
  const holdInLoop = (starts, anchor, length, pos) => {
    const edge = starts.find((start) => start > anchor && start <= anchor + length);
    if (edge === undefined || anchor + length - edge >= Math.min(LOOP_LINE_MIN_MS, length * 0.5)) return pos;
    return Math.min(pos, edge - AUDIO_LEAD_MS - 1);
  };

  function outgoingPosition(overlap, blocks, elapsed, starts = []) {
    const speed = overlap.speedA || 1;
    const beatMs = 60000 / (overlap.bpmA || 120);
    let pos = overlap.startAMs;
    let at = 0;
    for (const block of blocks) {
      const from = block.start * overlap.durationMs;
      const to = block.end * overlap.durationMs;
      const length = block.beats * beatMs;
      if (!(length > 0) || to <= from) continue;
      pos += (Math.min(elapsed, from) - at) * speed;
      at = Math.min(elapsed, from);
      if (elapsed <= from) return pos;
      const inside = (Math.min(elapsed, to) - from) * speed;
      const anchor = pos;
      pos += inside % length;
      at = Math.min(elapsed, to);
      if (elapsed <= to) return holdInLoop(starts, anchor + AUDIO_LEAD_MS, length, pos);
    }
    return pos + (elapsed - at) * speed;
  }

  function startSplit(lines, overlap, blocks, effects, nextUri, from, to) {
    closeSplit();
    hideTeaser();
    // Si a la canción que sale se le acaba la letra antes que la mezcla, la vista se suelta
    // ahí. El reloj corregido sigue hasta el final real: el audio continúa mezclándose
    const lastLineEnd = Math.max(...lines.map((line) => line.end));
    const starts = lines.filter((line) => !line.background).map((line) => line.start).sort((a, b) => a - b);
    let releaseAt = overlap.durationMs;
    for (let t = 0; t < overlap.durationMs; t += 50) {
      if (outgoingPosition(overlap, blocks, t) + AUDIO_LEAD_MS >= lastLineEnd) {
        releaseAt = Math.min(overlap.durationMs, t + RELEASE_AFTER_LAST_LINE_MS);
        break;
      }
    }
    active = { lines, overlap, blocks, effects, nextUri, releaseAt, fromName: from.name, toName: to.name, fromCover: from.cover, fromAmbient: from.ambient };
    patchClock(overlap, nextUri);
    let last = 0;
    const frame = (now) => {
      if (!active) return;
      loop = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      // El reloj sin corregir avanza a velocidad normal, igual que la mezcla
      const elapsed = rawPosition() - overlap.startBMs;
      // Se mantiene hasta que Spotify publica la posición real, con un límite por si nunca salta
      const endAt = overlap.durationMs + (clockPatched && !clockPublished ? 3000 : 0);
      if (Spicetify.Player.data?.item?.uri !== nextUri || clockSeeked || elapsed < -1500 || elapsed >= endAt) {
        closeSplit();
        return;
      }
      const page = document.querySelector("#SpicyLyricsPage");
      if (elapsed >= active.releaseAt || !page?.querySelector(".ContentBox")) {
        unmount();
        return;
      }
      if (!view || view.page !== page || !view.box.isConnected) mount(page);
      if (view) paint(outgoingPosition(overlap, blocks, Math.max(0, elapsed), starts) + AUDIO_LEAD_MS, Math.max(0, elapsed), now);
    };
    loop = requestAnimationFrame(frame);
  }

  const describe = (item) => (item?.uri ? { uri: item.uri, name: item.name, cover: coverUrl(item) } : null);

  // Dónde iba la canción justo antes de cambiar: en una mezcla, el cambio llega al empezar la
  // transición; si la canción terminó entera o se saltó a mano, no hubo mezcla aunque Spotify tenga una guardada
  const MIX_START_TOLERANCE_MS = 4000;
  const NATURAL_END_MS = 3000;
  // Se guarda por canción: el aviso de progreso de la nueva puede llegar antes que el del cambio
  const progressOf = new Map();
  Spicetify.Player.addEventListener("onprogress", (event) => {
    const uri = Spicetify.Player.data?.item?.uri;
    if (!uri || typeof event?.data !== "number") return;
    // La duración real de la canción: en las listas mezcladas, getDuration da el punto donde empieza la mezcla
    const length = Spicetify.Player.data?.item?.duration?.milliseconds ?? Number(Spicetify.Player.data?.item?.metadata?.duration);
    progressOf.set(uri, { at: event.data, length: length || Infinity });
    if (progressOf.size > 4) progressOf.delete(progressOf.keys().next().value);
  });

  async function onSongChange() {
    const token = ++session;
    closeSplit();
    const data = Spicetify.Player.data;
    const previous = current && { ...current, ambient: ambientShot };
    const left = previous ? progressOf.get(previous.uri) : null;
    // La copia queda congelada con la canción que sale; la siguiente empieza en otro lienzo
    ambientShot = null;
    current = describe(data?.item);
    // Si la canción que sale llegó a su final, terminó sola: ninguna mezcla empieza en los últimos segundos
    if (!left || left.at >= left.length - NATURAL_END_MS) return;
    const leftAt = left.at;
    const contextUri = data?.context?.uri ?? "";
    if (!current || !previous || previous.uri === current.uri || !contextUri.startsWith("spotify:playlist:")) return;
    try {
      const [transition, lines] = await Promise.all([
        P.PlaylistMixingAPI.getComposedTransitionForTrackPair(contextUri, previous.uri, current.uri),
        loadLyrics(previous.uri),
      ]);
      const overlap = transition?.overlap;
      const [blocks, effects] = await Promise.all([loopBlocksOf(transition?.preset), effectsOf(transition?.preset)]);
      if (token !== session || !overlap?.durationMs || !lines.length) return;
      if (overlap.trackAUri !== previous.uri || overlap.trackBUri !== current.uri) return;
      if (Math.abs(leftAt - overlap.startAMs) > MIX_START_TOLERANCE_MS) return;
      const elapsed = rawPosition() - overlap.startBMs;
      if (elapsed < -1500 || elapsed >= overlap.durationMs) return;
      startSplit(lines, overlap, blocks, effects, current.uri, previous, current);
    } catch {
      // Sin datos de transición: se queda solo la letra normal
    }
  }

  // Vista previa: unos segundos antes de que empiece una mezcla de verdad, asoma la primera línea
  // que se va a oír de la canción que entra (que no siempre es la primera de la canción)
  const TEASER_BEFORE_MS = 7000;
  const TEASER_LOOKAHEAD_MS = 60000;
  // Una mezcla guardada que empieza en los últimos segundos es la transición por defecto, no una mezcla
  const TEASER_MIN_MIX_LEAD_MS = 8000;
  let teaser = null;
  let plan = null;

  function hideTeaser() {
    if (!teaser) return;
    const el = teaser;
    teaser = null;
    el.classList.remove("is-on");
    setTimeout(() => el.remove(), 900);
  }

  function showTeaser(page, next) {
    if (teaser?.isConnected && teaser.dataset.uri === next.uri && teaser.parentElement === page.querySelector(".ContentBox")) return;
    hideTeaser();
    const box = page.querySelector(".ContentBox");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "ml-teaser";
    el.dataset.uri = next.uri;
    el.setAttribute("aria-hidden", "true");
    const label = document.createElement("small");
    if (next.cover) {
      const img = document.createElement("img");
      img.src = next.cover;
      img.alt = "";
      label.append(img);
    }
    label.append(`Up next · ${next.name}`);
    el.append(label);
    if (next.line) {
      const text = document.createElement("p");
      next.line.split(/\s+/).filter(Boolean).forEach((word, i) => {
        const span = document.createElement("span");
        span.textContent = word;
        span.style.setProperty("--i", i);
        text.append(span);
      });
      el.append(text);
    }
    box.append(el);
    teaser = el;
    // Un cuadro después, para que la entrada se anime desde abajo
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-on")));
  }

  async function preparePlan(uri, nextTrack, contextUri, length) {
    const key = `${uri}|${nextTrack.uri}`;
    if (plan?.key === key) return plan;
    plan = { key, ready: false };
    const mine = plan;
    try {
      const [transition, lines] = await Promise.all([
        P.PlaylistMixingAPI.getComposedTransitionForTrackPair(contextUri, uri, nextTrack.uri),
        loadLyrics(nextTrack.uri),
      ]);
      const overlap = transition?.overlap;
      if (plan !== mine) return plan;
      const real = overlap?.durationMs > 0 && overlap.trackAUri === uri && overlap.trackBUri === nextTrack.uri && overlap.startAMs < length - TEASER_MIN_MIX_LEAD_MS;
      const first = lines.find((line) => !line.background && line.end > overlap?.startBMs + 500);
      const meta = nextTrack.metadata ?? {};
      Object.assign(mine, {
        ready: true,
        real,
        startAMs: overlap?.startAMs,
        next: {
          uri: nextTrack.uri,
          name: meta.title ?? meta.name ?? "",
          cover: coverUrl({ metadata: meta }),
          line: first ? first.words.map((word, i) => word.text + (word.joined || i === first.words.length - 1 ? "" : " ")).join("").trim() : "",
        },
      });
    } catch {
      Object.assign(mine, { ready: true, real: false });
    }
    return mine;
  }

  function checkTeaser() {
    const page = document.querySelector("#SpicyLyricsPage");
    const data = Spicetify.Player.data;
    const contextUri = data?.context?.uri ?? "";
    const uri = data?.item?.uri;
    const nextTrack = Spicetify.Queue?.nextTracks?.[0]?.contextTrack;
    if (active || !page || document.hidden || data?.isPaused || !uri || !contextUri.startsWith("spotify:playlist:") || !nextTrack?.uri?.startsWith("spotify:track:")) {
      hideTeaser();
      return;
    }
    const length = data.item.duration?.milliseconds ?? Number(data.item.metadata?.duration);
    const at = Spicetify.Player.getProgress();
    if (!length || length - at > TEASER_LOOKAHEAD_MS + TEASER_BEFORE_MS) {
      hideTeaser();
      return;
    }
    if (plan?.key !== `${uri}|${nextTrack.uri}`) preparePlan(uri, nextTrack, contextUri, length);
    if (!plan?.ready || !plan.real || at < plan.startAMs - TEASER_BEFORE_MS || at >= plan.startAMs) {
      hideTeaser();
      return;
    }
    showTeaser(page, plan.next);
  }

  setInterval(checkTeaser, 250);

  Spicetify.Player.addEventListener("songchange", onSongChange);
  Spicetify.Player.addEventListener("songchange", hideTeaser);
  current = describe(Spicetify.Player.data?.item);
})();
