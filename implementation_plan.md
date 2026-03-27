# PCS Chinese Learning Fun Game Implementation Plan

This plan documents the architecture, technology stack, logic, and styling for the PCS Chinese Learning Fun Game. The game will be built using modern web standards (HTML, Vanilla CSS, Vanilla JavaScript) and bundled with Vite to make it easily deployable to Vercel.

## Proposed Changes

### Data Structure (JSON)
The source data from `Kindergarten.txt` and `FirstGrade.txt` will be processed and structured directly into clean JSON files (`kindergarten.json` and `firstGrade.json`) to allow for fast and efficient lookup in the game.

### Vite Project Initialization
I will create a standard Vanilla JavaScript Vite application setup inside `c:\Users\harri\OneDrive\桌面\VibeCoding\PCSFunGame`. This will give us a fast development server and an optimized output for Vercel deployment without the overhead of heavy frameworks, fulfilling the requirement for maximum flexibility and control using vanilla tools.

### Data Structure (JSON)
The textbook contents will be modeled as JSON to allow for fast and clean lookup.
#### `src/data/kindergarten.json`
```json
{
  "units": [
    {
      "id": 1,
      "lessons": [
        {
          "id": 1,
          "words": ["一", "二", "三"],
          "rhythm": ["一二三四五", "上山打老虎"]
        }
      ]
    }
  ]
}
```
(*Similarly scaling out to all the nested complexities specified in the prompt for Kindergarten and 1st Grade.*)

### UI Layout
The game will implement the requested aesthetics and responsive design using Vanilla CSS. 
- **Global:** The background will be a full-screen CSS-drawn landscape—a vibrant blue sky at the top, a series of light white clouds, and a green grass strip along the bottom.
- **Layout:** A grid/flex layout:
  - **Left Panel:** Main navigation buttons ("Kindergarten 学前班", "1st Grade 一年级", "关于游戏", "Donation").
  - **Center Panel:** The main interaction area, sized adaptively for touch devices and computers. Word bounding boxes, flying text, and flower/diamond rewards animations.
  - **Right Panel:** Display metrics fields for "Lesson", "Award", and "Score".

### Game Logic & Animation Engine
I will write custom JavaScript logic (`src/game.js`) to drive the functionality:
1. **Dropdown Cascading:** Selecting a grade dynamically populates a 3-tier custom UI dropdown tree (Unit -> Lesson -> Section).
2. **Physics/Animation Engine:** Floating text will be managed using HTML elements with absolutely positioned standard `requestAnimationFrame` loops. Text elements will have `x`, `y`, `vx`, `vy` values and will reverse velocity when their bounding boxes intersect the screen edges or each other.
3. **Audio Synthesizer Hinting:** I will use the browser's native `SpeechSynthesis` API to naturally pronounce the required characters/sentences, acting as the hint.
4. **Scoring & Awards Mechanics:**
   - 100 points for correct Word.
   - 1,000 points and a Flower for a correct Sentence (Rhythms/Texts/Readings/Laughs).
   - 5 Flowers combine into a Diamond with a smooth transition.
5. **Instructional Overlays & Modals:** 
   - Awards and gaming status announcements (e.g. "Great job! You earn a flower!", "You finished this lesson. Welcome back later!") will be displayed explicitly in the middle of the screen.
   - "About" section and lesson completion messages will use centered modal cards with a blurred glassmorphism background.

## Verification Plan

### Manual Verification
1. Open the dev server in the browser and verify the scenic background, and the layout.
2. Traverse through Grades -> Units -> Lessons -> Sections dropdown menus to verify correct data matching based on your complex rules.
3. Interact with the Game Center to verify the bouncing animations, word selection, Text-To-Speech pronunciation matching, edge-collision logic, and point/award allocation.
4. Test responsiveness by resizing the browser to mobile and tablet dimensions (iPad).
