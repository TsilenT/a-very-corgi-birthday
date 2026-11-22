(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const stage = byId("game-stage");
  const image = byId("scene-image");
  const kicker = byId("scene-kicker");
  const title = byId("scene-title");
  const description = byId("scene-description");
  const progress = byId("scene-progress");
  const actions = byId("game-actions");
  const status = byId("game-status");
  const checklist = byId("checklist");
  const count = byId("progress-count");
  const soundToggle = byId("sound-toggle");
  const reset = byId("reset-button");
  const decor = byId("scene-decor");
  const confetti = byId("confetti");
  const mascot = byId("mascot");

  const saveKey = "a-very-corgi-birthday/v1";
  const colors = {
    peach: { label: "Peach", hex: "#ed8e79" },
    lilac: { label: "Lilac", hex: "#ac8bc9" },
    mint: { label: "Mint", hex: "#7ab79b" },
    yellow: { label: "Butter yellow", hex: "#eccc76" },
  };
  const ingredients = {
    eggs: { label: "Crack the eggs", icon: "🥚", reply: "One paw tap. Two perfectly cracked eggs." },
    flour: { label: "Add the flour", icon: "☁️", reply: "Pip adds flour. Pip is now also wearing flour." },
    sugar: { label: "Add the sugar", icon: "✨", reply: "In goes the sugar, with one very hopeful sniff." },
  };
  const decorations = {
    bunting: { label: "Hang the bunting", icon: "🎏", reply: "Pip stands on a stool. Then on tiptoes. Perfect." },
    cake: { label: "Set out the cake", icon: "🎂", reply: "The cake makes it to the table. A heroic effort." },
    balloons: { label: "Tie up the balloons", icon: "🎈", reply: "Three bows, four paws, and only one tangled ear." },
  };
  const tasks = [
    { label: "Bake a cake", icon: "🍰" },
    { label: "Get balloons", icon: "🎈" },
    { label: "Decorate the house", icon: "🎀" },
    { label: "Sing for Camille", icon: "♫" },
  ];
  const scenes = {
    kitchen: { alt: "A sunlit cottage kitchen with a mixing bowl and strawberries" },
    shop: { alt: "A little shop full of balloons in soft colors" },
    "living-room": { alt: "Camille's cozy sitting room, ready to be decorated" },
    party: { alt: "Camille's sitting room filled with birthday decorations" },
  };
  const phases = ["intro", "ingredients", "mix", "bake", "frost", "shop", "pump", "decorate", "arrival", "complete"];
  const freshState = () => ({
    phase: "intro",
    ingredients: [],
    stirs: 0,
    colors: [],
    pumps: 0,
    inflated: 0,
    decorations: [],
    sound: true,
  });

  function readSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey));
      return saved && phases.includes(saved.phase) ? { ...freshState(), ...saved } : freshState();
    } catch {
      return freshState();
    }
  }

  let state = readSave();
  let currentScene;
  let reactionTimer;
  let sillyIndex = 0;
  let song = null;
  let audio;
  let volume;

  function save() {
    try {
      const phase = state.phase === "singing" ? song.resumePhase : state.phase;
      localStorage.setItem(saveKey, JSON.stringify({ ...state, phase }));
    } catch {
      // The whole game is still playable when browser storage is unavailable.
    }
  }

  function announce(message, reaction) {
    status.textContent = message;
    if (!reaction) return;

    clearTimeout(reactionTimer);
    stage.dataset.reaction = reaction;
    mascot?.classList.add("is-reacting");
    reactionTimer = setTimeout(() => {
      delete stage.dataset.reaction;
      mascot?.classList.remove("is-reacting");
    }, 950);
  }

  function update(message, reaction = "happy") {
    const focusedAction = document.activeElement?.dataset?.action;
    save();
    render(focusedAction);
    if (message) announce(message, reaction);
  }

  const choice = (id, label, icon, run, variant = "") => ({ id, label, icon, run, variant });

  function next(id, label, icon, phase, message) {
    return choice(id, label, icon, () => {
      state.phase = phase;
      playEffect();
      update(message);
    }, "is-primary");
  }

  const view = (scene, task, heading, body, buttons, progressText = "") => ({
    scene, task, heading, body, buttons, progressText,
  });

  function addIngredient(id) {
    state.ingredients.push(id);
    if (state.ingredients.length === 3) state.phase = "mix";
    playEffect(60 + state.ingredients.length * 2);
    update(ingredients[id].reply);
  }

  function stir() {
    const replies = ["Swish. The bowl spins a little.", "Swish. Pip spins a little, too.", "The batter is smooth. Pip is dizzy."];
    const message = replies[state.stirs];
    state.stirs++;
    if (state.stirs === 3) state.phase = "bake";
    playEffect(55 + state.stirs * 3);
    update(message, "stir");
  }

  function buy(color) {
    state.colors.push(color);
    playEffect(67 + state.colors.length * 2);
    update(`${colors[color].label} it is! Pip hands over a coin.`, "buy");
  }

  function pump() {
    const color = state.colors[state.inflated];
    state.pumps++;
    playEffect(52 + state.pumps * 5);
    if (state.pumps === 3) {
      state.pumps = 0;
      state.inflated++;
      update(`${colors[color].label} balloon tied. It gives Pip a little boop.`, "boop");
      return;
    }
    update(state.pumps === 1 ? "Whoosh! The balloon begins to round out." : "Looking good. One more puff!", "pump");
  }

  function decorate(id) {
    state.decorations.push(id);
    playEffect(62 + state.decorations.length * 3);
    update(decorations[id].reply);
  }

  const views = {
    intro: () => view("kitchen", 0, "Pip has a plan.",
      "Camille’s birthday is today, and Pip has the whole house to himself. First up, a cake that’s taller than he is.",
      [next("start", "Let’s get baking", "🍰", "ingredients", "Pip scoots his stool up to the counter.")]),

    ingredients: () => view("kitchen", 0, "Into the mixing bowl", "Pip has a recipe and exactly enough paws to make a mess.",
      Object.entries(ingredients).filter(([id]) => !state.ingredients.includes(id)).map(([id, item]) =>
        choice(id, item.label, item.icon, () => addIngredient(id), "is-primary")),
      `${state.ingredients.length} of 3 ingredients`),

    mix: () => view("kitchen", 0, "A little paw power", "Give the batter three good stirs. Try to keep most of it in the bowl.",
      [choice("stir", "Stir the batter", "🥄", stir, "is-primary")], `${state.stirs} of 3 stirs`),

    bake: () => view("kitchen", 0, "Ready for the oven", "The batter is smooth and the oven is warm. Pip watches very closely.",
      [next("bake", "Bake the cake", "♨️", "frost", "Ding! The whole kitchen smells like vanilla.")]),

    frost: () => view("kitchen", 0, "The icing on the cake", "The cake has cooled. Pip has a piping bag and some very ambitious plans for the frosting.",
      [next("frost", "Add frosting", "🧁", "shop", "There’s frosting on the cake and on Pip’s nose.")]),

    shop: () => view("shop", 1, "The balloon shop", "Pip rattles the three coins in his little purse. Pick a color for each balloon.",
      state.colors.length === 3
        ? [next("take-balloons", "Take the balloons home", "🐾", "pump", "Pip trots home, with the balloon bag flapping behind him.")]
        : Object.entries(colors).filter(([color]) => !state.colors.includes(color)).map(([color, item]) => ({
          ...choice(color, `Buy ${item.label.toLowerCase()}`, "🎈", () => buy(color), "is-primary"), color,
        })),
      `${state.colors.length} of 3 balloons bought`),

    pump: () => {
      if (state.inflated === 3) {
        return view("living-room", 1, "Three very round balloons", "One for each coin. Pip keeps a firm paw on their ribbons.",
          [next("decorate", "Start decorating", "🎀", "decorate", "Pip studies the room like a very small interior decorator.")],
          "3 of 3 balloons inflated");
      }
      const color = colors[state.colors[state.inflated]].label.toLowerCase();
      return view("living-room", 1, "Huff, puff, boop", `Give the ${color} balloon three pumps, then Pip will tie it off.`,
        [choice("pump", "Pump the balloon", "🎈", pump, "is-primary")],
        `Balloon ${state.inflated + 1} of 3 · ${state.pumps} of 3 pumps`);
    },

    decorate: () => view("living-room", 2, "Make it a party", "The living room needs three finishing touches before Camille gets home.",
      state.decorations.length === 3
        ? [next("wait", "Listen for Camille", "♥", "arrival", "Footsteps on the porch. Pip’s ears spring up.")]
        : Object.entries(decorations).filter(([id]) => !state.decorations.includes(id)).map(([id, item]) =>
          choice(id, item.label, item.icon, () => decorate(id), "is-primary")),
      `${state.decorations.length} of 3 decorations in place`),

    arrival: () => view("living-room", 3, "Camille is home!", "The door swings open. Pip’s tail has never wagged faster. Light the candles and join in!",
      [choice("sing", "Sing happy birthday", "♫", startSong, "is-primary")]),

    singing: () => view("party", 3, "Happy birthday, Camille!", "Pip takes a deep breath and sings from the top of his little corgi lungs.", [], "♪"),

    complete: () => view("party", 4, "Happy birthday, Camille!", "Camille scoops up Pip for a birthday hug. Pip may or may not have meant for that to be the last step.",
      [choice("sing-again", "Sing it again", "♫", startSong, "is-primary"),
        choice("replay", "Play again", "↺", restart, "is-quiet")], "Party complete!"),
  };

  function makeAction(item, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `game-action ${item.variant}`.trim();
    button.dataset.action = item.id;
    if (item.color) button.dataset.color = item.color;
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    button.append(span("action-icon", item.icon, true), span("action-label", item.label), span("action-key", index + 1, true));
    button.addEventListener("click", item.run);
    return button;
  }

  function span(className, value, decorative = false) {
    const element = document.createElement("span");
    element.className = className;
    element.textContent = value;
    if (decorative) element.setAttribute("aria-hidden", "true");
    return element;
  }

  function render(focusedAction) {
    const page = views[state.phase]();
    if (currentScene !== page.scene) {
      currentScene = page.scene;
      image.src = `assets/${page.scene}.webp`;
      image.alt = scenes[page.scene].alt;
    }

    stage.dataset.scene = page.scene;
    stage.dataset.phase = state.phase;
    stage.dataset.cake = String(state.decorations.includes("cake"));
    stage.dataset.bunting = String(state.decorations.includes("bunting"));
    stage.dataset.balloons = String(state.decorations.includes("balloons"));
    stage.dataset.candles = String(["singing", "complete"].includes(state.phase));
    stage.dataset.pump = state.pumps;
    stage.dataset.balloonColor = state.phase === "pump" ? state.colors[state.inflated] ?? "" : "";

    kicker.textContent = page.task === 4 ? "The birthday party" : ["In the kitchen", "The balloons", "Back at home", "The surprise"][page.task];
    title.textContent = page.heading;
    description.textContent = page.body;
    progress.textContent = page.progressText;
    progress.hidden = !page.progressText;
    const singing = state.phase === "singing";
    progress.setAttribute("aria-hidden", String(singing));
    status.classList.toggle("sr-only", singing);

    const buttons = page.buttons.map(makeAction);
    actions.replaceChildren(...buttons);
    if (focusedAction) {
      const focusTarget = buttons.find((button) => button.dataset.action === focusedAction) ?? buttons[0] ?? title;
      focusTarget.focus({ preventScroll: true });
    }

    checklist.replaceChildren(...tasks.map((task, index) => {
      const item = document.createElement("li");
      item.className = "checklist-item";
      item.dataset.status = index < page.task ? "done" : index === page.task ? "active" : "pending";
      if (index === page.task) item.setAttribute("aria-current", "step");
      const hiddenState = span("sr-only", index < page.task ? " (done)" : "");
      item.append(span("checklist-icon", index < page.task ? "✓" : task.icon, true), span("checklist-label", task.label), hiddenState);
      return item;
    }));
    count.textContent = `${page.task} / ${tasks.length}`;

    if (decor) {
      decor.replaceChildren(...(page.scene === "living-room" && state.decorations.includes("balloons")
        ? state.colors.map((color) => {
          const balloon = span("scene-balloon", "", true);
          balloon.dataset.color = color;
          balloon.style.setProperty("--balloon-color", colors[color].hex);
          return balloon;
        }) : []));
    }
    renderSound();
  }

  function renderSound() {
    if (!soundToggle) return;
    soundToggle.setAttribute("aria-pressed", String(state.sound));
    soundToggle.setAttribute("aria-label", state.sound ? "Sound on" : "Sound off");
    soundToggle.dataset.muted = String(!state.sound);
    const label = soundToggle.querySelector("[data-sound-label]");
    if (label) label.textContent = state.sound ? "Sound on" : "Sound off";
  }

  function getAudio() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return null;
    try {
      if (!audio) {
        audio = new Audio();
        volume = audio.createGain();
        volume.gain.value = state.sound ? 0.32 : 0;
        volume.connect(audio.destination);
      }
      if (audio.state === "suspended") audio.resume().catch(() => {});
      return audio;
    } catch {
      return null;
    }
  }

  function tone(midi, start, length, strength, shape = "sine", output = volume) {
    const source = audio.createOscillator();
    const envelope = audio.createGain();
    source.type = shape;
    source.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(strength, start + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + length);
    source.connect(envelope);
    envelope.connect(output);
    source.start(start);
    source.stop(start + length);
  }

  function playEffect(midi = 72) {
    if (!state.sound || !getAudio()) return;
    const now = audio.currentTime;
    tone(midi, now, 0.16, 0.22, "triangle");
    tone(midi + 7, now + 0.045, 0.15, 0.12);
  }

  const verses = [
    { lyric: "Happy birthday to you,", chord: [48, 55, 60], notes: [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2]] },
    { lyric: "Happy birthday to you,", spokenLyric: "Pip repeats, happy birthday to you.", chord: [43, 55, 59], notes: [[67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2]] },
    { lyric: "Happy birthday, dear Camille,", chord: [48, 55, 64], notes: [[67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2]], vowels: ["ah", "ee", "er", "ay", "ee", "ah", "ee"] },
    { lyric: "Happy birthday to you!", chord: [41, 53, 60], notes: [[77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 2.5]] },
  ];
  const birthdayVowels = ["ah", "ee", "er", "ay", "oo", "oo"];
  const formants = { ah: [720, 1230], ee: [310, 2170], er: [490, 1370], ay: [570, 1670], oo: [410, 810] };

  function singNote(midi, vowel, start, length, output) {
    const voice = audio.createOscillator();
    const vibrato = audio.createOscillator();
    const vibratoDepth = audio.createGain();
    const envelope = audio.createGain();

    voice.type = "sawtooth";
    voice.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    voice.detune.setValueAtTime(-55, start);
    voice.detune.linearRampToValueAtTime(0, start + 0.055);
    vibrato.frequency.value = 5.3;
    vibratoDepth.gain.value = 18;
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(voice.detune);

    for (const frequency of formants[vowel]) {
      const resonance = audio.createBiquadFilter();
      resonance.type = "bandpass";
      resonance.frequency.value = frequency;
      resonance.Q.value = 2.5;
      voice.connect(resonance);
      resonance.connect(envelope);
    }

    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(0.48, start + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.3, start + length * 0.67);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + length);
    envelope.connect(output);
    voice.start(start);
    voice.stop(start + length);
    vibrato.start(start);
    vibrato.stop(start + length);
    tone(midi, start, length, 0.18, "sine", output);
  }

  function startSong() {
    if (song) return;

    const resumePhase = state.phase;
    state.phase = "singing";
    const context = getAudio();
    const beat = 0.46;
    const delay = 0.22;
    const start = context ? context.currentTime + delay : 0;
    const track = context?.createGain();
    if (track) track.connect(volume);
    song = { track, timers: [], resumePhase };
    update("Pip clears his throat. Ahem…", "sing");
    scatter();

    let elapsed = 0;
    for (const verse of verses) {
      song.timers.push(setTimeout(() => {
        progress.textContent = `♪ ${verse.lyric}`;
        announce(verse.spokenLyric ?? verse.lyric, "sing");
      }, (delay + elapsed) * 1000));

      if (track) verse.chord.forEach((note, index) => tone(note, start + elapsed + index * 0.055, 1.2, 0.11, "sine", track));
      const vowels = verse.vowels ?? birthdayVowels;
      for (const [index, [note, beats]] of verse.notes.entries()) {
        const length = beats * beat;
        if (track) singNote(note, vowels[index], start + elapsed, length * 0.91, track);
        elapsed += length;
      }
    }

    song.timers.push(setTimeout(() => {
      stopSong();
      state.phase = "complete";
      update("Camille claps. Pip takes a bow!", "bow");
      if (document.activeElement === title) actions.firstElementChild?.focus({ preventScroll: true });
      scatter();
    }, (delay + elapsed + 0.2) * 1000));
  }

  function stopSong() {
    if (!song) return;
    for (const timer of song.timers) clearTimeout(timer);
    song.track?.disconnect();
    song = null;
  }

  function scatter() {
    if (!confetti || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const palette = Object.values(colors);
    confetti.replaceChildren(...Array.from({ length: 34 }, (_, index) => {
      const piece = span("confetti-piece", "", true);
      piece.style.setProperty("--x", `${(index * 19) % 100}%`);
      piece.style.setProperty("--color", palette[index % palette.length].hex);
      piece.style.setProperty("--delay", `${(index % 11) * 48}ms`);
      piece.style.setProperty("--drift", `${(index % 9 - 4) * 16}px`);
      piece.style.setProperty("--spin", `${(index % 8 + 1) * 95}deg`);
      return piece;
    }));
  }

  function restart() {
    stopSong();
    confetti?.replaceChildren();
    state = { ...freshState(), sound: state.sound };
    update("Back to the beginning. Pip has a plan!");
  }

  function beSilly() {
    if (state.phase === "singing") return;
    const sillies = [
      ["Pip does a little spin. Important birthday business.", "spin"],
      ["A crumb has been detected. The search is ongoing.", "sniff"],
      ["Pip does a big stretch with his little legs.", "stretch"],
      ["Pip lets out one very quiet boof.", "boof"],
    ];
    const [line, reaction] = sillies[sillyIndex++ % sillies.length];
    playEffect(59 + sillyIndex % 4);
    announce(line, reaction);
  }

  soundToggle?.addEventListener("click", () => {
    state.sound = !state.sound;
    if (audio) volume.gain.setTargetAtTime(state.sound ? 0.32 : 0, audio.currentTime, 0.025);
    if (state.sound && !song) playEffect();
    save();
    renderSound();
  });

  reset?.addEventListener("click", () => {
    if (state.phase === "intro") return;
    if (state.phase === "complete" || window.confirm("Start the birthday preparations over?")) restart();
  });

  for (const button of document.querySelectorAll("#mascot, button[data-silly]")) button.addEventListener("click", beSilly);
  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (!/^[1-4]$/.test(event.key)) return;
    const button = actions.children[Number(event.key) - 1];
    if (button) {
      event.preventDefault();
      button.focus({ preventScroll: true });
      button.click();
    }
  });

  title.tabIndex = -1;
  render();
})();
