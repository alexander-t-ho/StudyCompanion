# Detailed Implementation: Adaptive Practice and Lesson Memory

This document expands on the core mechanisms for achieving **Lesson Memory** and **Adaptive Practice** within the Cursor integration.

---

## 1. Lesson Memory: Remembering Previous Lessons

The AI Tutor needs to remember two types of information: **short-term context** (the current conversation) and **long-term context** (the student's overall mastery).

### A. Short-Term Context (Conversation History)

The most direct way to implement conversational memory is to pass the recent chat history with every API call to the AI model.

| Implementation Detail | Description |
| :--- | :--- |
| **Storage** | Store the full conversation history in the `conversation_history` table in the database. |
| **Retrieval** | On a new student message, retrieve the last **10 turns** (5 student, 5 AI) for the current session. |
| **API Payload** | Pass the retrieved history as an array of `messages` objects (with `role` and `content`) directly to the GPT-4 API. |
| **Conciseness** | Use a model like GPT-4 Turbo with a large context window to handle long conversations, but enforce the 2-4 sentence rule in the system prompt to keep the conversation focused. |

### B. Long-Term Context (Mastery and Misconceptions)

This is crucial for the AI to "remember" previous lessons and assign adaptive practice.

| Implementation Detail | Description |
| :--- | :--- |
| **Mastery Tracking** | Use the `student_mastery` table to track proficiency on granular topics (e.g., "Trigonometric Resolution," "Atwood Machine Equations," "Friction Force Calculation"). |
| **Misconception Logging** | The AI Tutor should be programmed to identify and log specific, recurring errors (e.g., "Student confuses $\sin\theta$ and $\cos\theta$ on incline problems"). This log is stored in the `student_mastery` table. |
| **System Prompt Injection** | The Backend API injects a summary of the long-term context into the AI's system prompt: *Example: "Student struggles with $\sin/\cos$ on inclines. Focus guidance on the force triangle."* |
| **Adaptive Problem Generation** | When generating a new problem, the AI Generator uses the mastery data to select a scenario that specifically targets the student's weakest area. |

---

## 2. Adaptive Practice: Assigning Adaptive Problems

Adaptive practice ensures the student is always working on the "Goldilocks" problem: not too easy, not too hard.

### A. Problem Tagging and Difficulty Scoring

Every problem in the problem bank must be tagged with metadata:

| Tag Type | Example Tags | Purpose |
| :--- | :--- | :--- |
| **Topic** | `Newton's Laws`, `Kinematics`, `Work & Energy` | Broad subject area. |
| **Sub-Topic** | `Incline FBD`, `Two-Body System`, `Angled Force Components` | Granular skill being tested. |
| **Difficulty** | `Level 1 (Easy)`, `Level 2 (Medium)`, `Level 3 (Hard)` | Static difficulty rating. |
| **Prerequisites** | `Trigonometry`, `Vector Addition` | Skills required to solve the problem. |

### B. Adaptive Problem Selection Algorithm

The selection process happens in the Backend API after a problem is completed:

1. **Identify Weakest Sub-Topic:** Query the `student_mastery` table to find the sub-topic with the lowest mastery score (e.g., "Angled Force Components" at 45%).
2. **Determine Target Difficulty:**
    - If mastery is **< 50%**: Select a **Level 1** problem tagged with the weakest sub-topic.
    - If mastery is **50-75%**: Select a **Level 2** problem tagged with the weakest sub-topic.
    - If mastery is **> 75%**: Select a **Level 3** problem tagged with the weakest sub-topic, or a Level 2 problem on the next sequential topic.
3. **Filter and Assign:** Query the `problem_bank` for a problem matching the target tags that the student has not yet attempted (or has not attempted recently).
4. **Generate New Problem (Fallback):** If no suitable problem is found in the bank, the Backend calls the **AI Generator Service** to create a new problem with the required tags and difficulty.

### C. Example Adaptive Flow

| Step | Student Action | System Response | Adaptive Logic |
| :--- | :--- | :--- | :--- |
| **1** | Completes Problem 1 (Incline FBD) correctly after 5 hints. | Mastery Score for "Incline FBD" is updated to 60%. | System notes struggle with force components. |
| **2** | System assigns Problem 3 (Block Pulled with Friction). | **Level 3** problem assigned to test "Angled Force Components" (a related, higher-level skill). | System targets the specific weak point identified in Step 1. |
| **3** | Student struggles with $F_N$ calculation in Problem 3. | AI Tutor is injected with the memory: *"Student struggles with $\sin/\cos$ on inclines."* | AI immediately focuses guidance on the vertical force components and trigonometry. |
| **4** | Student completes Problem 3 incorrectly. | Mastery Score for "Angled Force Components" drops to 40%. | System assigns a **Level 1** problem focused purely on resolving a vector into $\sin/\cos$ components. |

---

## 3. Conversational AI: Answering Questions Conversationally

The conversational quality relies heavily on the **System Prompt** and the **Conciseness Constraint**.

### A. System Prompt Refinement

The prompt must explicitly define the AI's persona and constraints:

> "You are **Manus**, an encouraging and concise AP Physics 1 tutor. Your goal is to guide the student to the solution using the Socratic method. **NEVER** provide the final numerical answer. Your responses must be **2-4 sentences long** and end with a **guiding question**. You have access to the student's history: *[INJECTED MEMORY HERE]*. If the student asks for the answer, politely redirect them by asking a question about the first step."

### B. Dynamic Diagram Integration

The AI must be able to call for a diagram to maintain conciseness.

| Student Question | AI Tutor Response (Internal Logic) |
| :--- | :--- |
| "What is the Normal Force?" | *AI determines a diagram is not needed.* "The Normal Force is the force perpendicular to the surface. To find it, you must analyze the forces in the **vertical direction**. What is the net force in the vertical direction for a block on a horizontal surface?" |
| "I don't get the components of gravity." | *AI determines a diagram is needed.* "This is a key concept! Let me generate a diagram to show the component breakdown. [DIAGRAM: FBD_COMPONENTS_BREAKDOWN]. Which component is parallel to the ramp?" |

This mechanism allows the AI to provide a complex explanation visually, keeping the text response short and conversational.
