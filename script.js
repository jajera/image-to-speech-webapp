const body = document.body;
const voiceSelect = document.getElementById("voiceSelect");
const rateInput = document.getElementById("rate");
const pitchInput = document.getElementById("pitch");
const rateValue = document.getElementById("rateValue");
const pitchValue = document.getElementById("pitchValue");
const dropzone = document.getElementById("dropzone");
const imageInput = document.getElementById("imageInput");
const output = document.getElementById("extractedText");

// Theme toggle and auto-detect
function toggleTheme() {
  const isDark = body.classList.toggle("dark");
  document.getElementById("themeIcon").textContent = isDark ? "🌙" : "🌞";
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

window.onload = () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("theme");
  const useDark = savedTheme === "dark" || (!savedTheme && prefersDark);
  body.classList.toggle("dark", useDark);
  document.getElementById("themeIcon").textContent = useDark ? "🌙" : "🌞";
  populateVoices();
};

// Voice setup
function populateVoices() {
  try {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) {
      setTimeout(populateVoices, 200);
      return;
    }

    voiceSelect.innerHTML = "";
    voices.forEach((voice, i) => {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? " [default]" : ""}`;
      voiceSelect.appendChild(option);
    });

    const female = voices.find(v => /female|zira|samantha|eva|tessa|karen/i.test(v.name));
    if (female) voiceSelect.value = voices.indexOf(female);
  } catch (err) {
    console.error("Error loading voices:", err);
  }
}

speechSynthesis.onvoiceschanged = populateVoices;

function speakText() {
  try {
    if (!output || !output.textContent) {
      alert("No text to speak. Output element missing or empty.");
      return;
    }
    const rawText = output.textContent.trim();
    if (!rawText) {
      alert("No text to speak.");
      return;
    }

    const voices = speechSynthesis.getVoices();
    const index = parseInt(voiceSelect.value, 10);
    if (!voices[index]) {
      alert("Selected voice is not available.");
      return;
    }

    speechSynthesis.cancel();

    const cleanedText = rawText
      .replace(/[ \t]+/g, ' ')                      // collapse multiple spaces/tabs
      .replace(/[\r\n]+(?=\S)/g, ' ')              // merge lines unless separated by punctuation
      .replace(/(\S)-\s+/g, '$1')                   // join hyphenated line breaks
      .trim();

    const utterances = cleanedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanedText];

    utterances.forEach((sentence) => {
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      utterance.voice = voices[index];
      utterance.rate = Math.min(2, Math.max(0.5, parseFloat(rateInput.value)));
      utterance.pitch = Math.min(2, Math.max(0, parseFloat(pitchInput.value)));
      speechSynthesis.speak(utterance);
    });
  } catch (err) {
    console.error("Speech synthesis failed:", err.message || err);
    alert(`Unable to speak text.\n\n${err.message || err}`);
  }
}

function stopSpeaking() {
  speechSynthesis.cancel();
}

function clearText() {
  speechSynthesis.cancel();
  output.textContent = "";
}

// Display rate/pitch values
rateInput.addEventListener("input", () => {
  rateValue.textContent = rateInput.value;
});
pitchInput.addEventListener("input", () => {
  pitchValue.textContent = pitchInput.value;
});

// Handle image input via file
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) handleImage(file);
});

// Handle paste
dropzone.addEventListener("paste", (event) => {
  const items = event.clipboardData.items;
  for (let item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      handleImage(file);
    }
  }
});

// Handle drag-and-drop
dropzone.addEventListener("dragover", (e) => e.preventDefault());
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleImage(file);
});

// OCR with Tesseract.js
function handleImage(file) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const reader = new FileReader();

  reader.onload = () => {
    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        Tesseract.recognize(canvas, 'eng', {
          tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ{}:;.-_()%#@! \n',
        })
        .then(({ data: { text } }) => {
          output.textContent = text || "(No readable text found)";
        })
        .catch(err => {
          console.error("Tesseract OCR error:", err);
          alert("Failed to extract text from image.");
        });
      } catch (drawErr) {
        console.error("Canvas draw error:", drawErr);
      }
    };
    img.onerror = () => {
      alert("Failed to load image.");
    };
    img.src = reader.result;
  };

  reader.onerror = () => {
    alert("Failed to read image file.");
  };

  reader.readAsDataURL(file);
}

// Shortcut keys
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") speakText();
  if (e.ctrlKey && e.key === "Backspace") stopSpeaking();
  if (e.ctrlKey && e.key.toLowerCase() === "c") clearText();
});
