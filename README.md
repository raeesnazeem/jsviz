# JSViz: JavaScript Execution Visualizer

JSViz is a comprehensive, interactive tool designed to demystify the internal workings of the JavaScript engine. By providing a step-by-step visual representation of code execution, it helps developers and students understand complex concepts like the call stack, scope, closures, and the event loop.

![JSViz Banner](https://raw.githubusercontent.com/raeesnazeem/jsviz/main/public/banner.png) *(Note: Add actual banner link if available)*

## 🚀 Features

- **Interactive Code Editor**: Powered by **CodeMirror 6**, featuring syntax highlighting and real-time execution line indicators (Current & Next).
- **Dynamic Visualization**:
    - **Call Stack**: Real-time tracking of function execution frames and local variable states.
    - **Web APIs**: Visual representation of asynchronous operations (e.g., `setTimeout`) moving out of the main thread.
    - **Callback Queue**: Monitors tasks waiting to be pushed onto the stack.
    - **Event Loop**: Animated indicator showing the coordination between the stack and queue.
- **AI-Powered Explanations**: Integrates with **Groq AI (Llama 3)** to provide natural language narrations for every execution step via **Server-Sent Events (SSE)**.
- **Console Synchronization**: A dedicated console panel that captures `console.log` output perfectly synced with the visualized steps.
- **Playback Controls**: 
    - Manual scrubbing via an interactive slider.
    - Auto-play with adjustable speeds (Slow, Normal, Fast).
    - Keyboard shortcuts: `ArrowRight` (Next), `ArrowLeft` (Back), `Space` (Play/Pause), `Home` (Reset).
- **Intelligent Arrow Overlays**: SVG-based animated arrows that dynamically point out relationships between UI elements (e.g., from a callback to its origin frame).

---

## 🛠️ Architecture & Tech Stack

JSViz is built with a decoupled, modern architecture:

### Frontend
- **Framework**: React 19 (Vite)
- **State Management**: React Context API + `useReducer` for robust global state.
- **Editor**: CodeMirror 6 with custom extensions for execution tracking.
- **Icons & UI**: Lucide-React and custom CSS Modules for a sleek, dark-themed interface.

### Backend
- **Runtime**: Node.js with Express.
- **AI**: Groq SDK for high-performance LLM streaming.
- **Communication**: SSE (Server-Sent Events) for real-time AI narration delivery.

### Execution Engine (The Core)
- **Parser**: **Acorn** is used to generate an Abstract Syntax Tree (AST) from raw JavaScript.
- **Custom Interpreter**: A hand-rolled interpreter that "walks" the AST and generates system snapshots (Steps) instead of just executing the code. Each step captures a deep-cloned state of the entire environment.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- A Groq API Key (Sign up at [console.groq.com](https://console.groq.com))

### 1. Clone the Repository
```bash
git clone https://github.com/raeesnazeem/jsviz.git
cd jsviz
```

### 2. Setup the Backend
```bash
cd backend
npm install
# Create a .env file
echo "GROQ_API_KEY=your_api_key_here" > .env
npm start
```

### 3. Setup the Frontend
```bash
# In a new terminal tab
npm install
npm run dev
```

The application will be running at `http://localhost:5173`.

---

## 📂 Project Structure

```text
jsviz/
├── backend/                # Express server for AI narrations
│   ├── server.js           # SSE streaming logic
│   └── .env                # API Keys
├── src/
│   ├── components/         # Modular UI units (Editor, CallStack, etc.)
│   ├── context/            # Visualizer & Arrow state providers
│   ├── hooks/              # Custom logic (usePlayback, useExplanation)
│   ├── interpreter/        # Core AST parsing and execution logic
│   │   ├── parser.js       # Acorn integration
│   │   ├── interpreter.js  # State snapshot logic
│   │   └── stepTypes.js    # Step definitions
│   ├── styles/             # Global themes and CSS variables
│   └── App.jsx             # Main layout entry point
├── summary.md              # Detailed technical documentation
└── README.md               # You are here!
```

---

## 🧠 How It Works Internally

1. **AST Generation**: Your code is parsed into an Abstract Syntax Tree.
2. **Step Snapshotting**: The interpreter runs through the AST. At every variable declaration, assignment, or function call, it takes a "snapshot" of the current memory and stack.
3. **Immutability**: Every step is deep-cloned to ensure that navigating backward in time shows the exact state of that moment without mutations from future steps.
4. **Reactive Visualization**: The React UI subscribes to the `VisualizerContext`. As the user scrubs the slider, the UI re-renders based on the snapshot stored at that index.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
