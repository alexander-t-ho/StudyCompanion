# Technical Architecture for Cursor Integration

This architecture outlines how to integrate the AI-powered practice system into a platform like Cursor, focusing on the four key requirements: **Memory, Adaptive Practice, Conversational AI, and Human Handoff.**

---

## 1. Core Components

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend (Cursor UI)** | React/Vue.js | Displays problems, FBDs, and the AI chat interface. |
| **Backend API (Gateway)** | FastAPI/Node.js | Handles all requests, routes them to the appropriate service, and manages session state. |
| **Database (PostgreSQL)** | PostgreSQL | Stores student profiles, problem bank, mastery scores, and conversation history (for memory). |
| **AI Service (Tutor)** | OpenAI GPT-4 | Executes the Socratic guidance logic and determines when to generate diagrams or handoff to a human. |
| **AI Service (Generator)** | GPT-4 Turbo | Generates new practice problems from transcripts/curriculum data. |
| **Diagram Service** | Python/Matplotlib | Programmatically generates accurate FBDs and other required diagrams. |
| **Human Tutor Service** | WebSocket/Queue | Manages the queue and real-time connection for human tutor handoff. |

---

## 2. Data Flow and Memory Implementation

The key to **Memory** is storing and retrieving relevant student data for the AI Tutor.

### A. Database Schema for Memory

| Table | Key Fields | Purpose |
| :--- | :--- | :--- |
| `student_mastery` | `student_id`, `topic_id`, `mastery_score`, `last_attempt_date` | Tracks student proficiency on specific concepts (e.g., "Incline Plane FBDs"). |
| `conversation_history` | `session_id`, `student_id`, `messages` (JSONB), `problem_id` | Stores the full chat log for the AI to maintain context. |
| `problem_attempts` | `student_id`, `problem_id`, `is_correct`, `time_spent`, `hints_used` | Logs performance data used to calculate mastery and drive adaptive practice. |

### B. AI Context Injection

Before sending a student's question to the GPT-4 Tutor, the Backend API must construct a comprehensive **Context Prompt**.

| Context Element | Source | Purpose |
| :--- | :--- | :--- |
| **Problem Details** | `problem_bank` | The current problem, parameters, and required FBD. |
| **Conversation History** | `conversation_history` | The last 5-10 turns of the current chat session. |
| **Student Mastery** | `student_mastery` | The student's current mastery score for the **topic** (e.g., "Mastery: 65% on Force Components"). |
| **Recent Performance** | `problem_attempts` | Summary of the student's performance on the **current problem** (e.g., "Student has used 3 hints and made 1 incorrect attempt"). |

**Example Context Prompt Snippet (Injected into System Prompt):**

> "The student is currently working on Problem 1 (Frictionless Incline). Their overall mastery of 'Force Components' is 65%. In this problem, they have used 3 hints and incorrectly stated $F_{||} = mg \cos\theta$. Guide them to correct this without giving the final answer."

---

## 3. Adaptive Practice Implementation

Adaptive practice is driven by the **Mastery Score** and the **Problem Bank**.

### A. Mastery Score Calculation

The mastery score for a topic (e.g., "Newton's Second Law") is updated after every problem attempt using a simple **spaced repetition algorithm** or a more complex **Item Response Theory (IRT)** model.

**Simple Mastery Update Logic:**
1. **Correct Answer (First Try):** Mastery Score $\uparrow$ (e.g., +10 points)
2. **Correct Answer (After Hints):** Mastery Score $\uparrow$ (e.g., +5 points)
3. **Incorrect Answer:** Mastery Score $\downarrow$ (e.g., -15 points)
4. **Time Spent:** Longer time spent on a problem suggests lower confidence, even if correct.

### B. Adaptive Problem Selection

When the student finishes a problem, the Backend API selects the next problem based on the following logic:

| Mastery Score Range | Problem Selection Strategy | Goal |
| :--- | :--- | :--- |
| **< 50% (Struggling)** | Assign a **Level 1** problem on the same sub-topic (e.g., another Incline FBD) or a **Level 2** problem on a prerequisite topic. | Reinforce fundamentals. |
| **50% - 75% (Developing)** | Assign a **Level 2** problem on the same topic, or a **Level 1** problem on a related, unmastered topic. | Build confidence and breadth. |
| **> 75% (Mastered)** | Assign a **Level 3** problem on the same topic (e.g., Block Pulled with Friction) or a **Level 2** problem on the next sequential topic. | Challenge and advance learning. |

---

## 4. Human Tutor Handoff Protocol

The AI Tutor must be programmed to recognize when it is failing to help the student and initiate a handoff to a human tutor.

### A. Handoff Triggers (Logic in AI Service)

The AI Service monitors the conversation and triggers a handoff based on a combination of factors:

1. **Frustration/Emotional Cues:** Student uses language indicating high frustration (e.g., "I give up," "This is impossible," excessive use of profanity).
2. **High Hint/Interaction Count:** Student has used more than **5 hints** or had more than **10 conversational turns** on a single problem without making progress.
3. **Repeated Misconceptions:** Student repeatedly makes the same fundamental error (e.g., $F_{||} = mg \cos\theta$) despite multiple guiding questions.
4. **Explicit Request:** Student explicitly asks for a human tutor ("Can I talk to a real person?").

### B. Handoff Process

1. **AI Acknowledgment:** The AI Tutor acknowledges the need for help: *"I see you're still stuck on the force components. I'm going to connect you with a human tutor who can provide real-time, personalized help."*
2. **Data Packaging:** The Backend API packages the complete context:
    - Student Profile
    - Current Problem ID
    - Full `conversation_history`
    - Student's `mastery_score`
    - Summary of the student's last incorrect attempt.
3. **Queue Submission:** The package is submitted to the **Human Tutor Service Queue**.
4. **Real-Time Connection:** The Human Tutor Service uses **WebSockets** to notify the next available human tutor and connect them to the student's session, passing the packaged context for a seamless transition.

---

## 5. Conversational AI Logic

The conversational flow is managed by the GPT-4 Tutor using the Socratic method, as demonstrated in the previous phase.

### A. Key System Prompt Directives

| Directive | Purpose |
| :--- | :--- |
| **Socratic Method** | Ensures guidance through questions, not answers. |
| **Conciseness** | Enforces the 2-4 sentence limit for readability. |
| **Context Awareness** | Instructs the AI to reference the student's mastery and previous attempts. |
| **Diagram Generation** | Instructs the AI to call the Diagram Service when a visual aid is needed. |
| **Handoff Monitoring** | Instructs the AI to monitor for the Handoff Triggers (e.g., frustration, high turn count) and recommend handoff to the Backend API. |

### B. Dynamic Diagram Integration

The AI Tutor's response should include a flag or command to the Frontend to display a dynamically generated diagram:

**AI Response (Internal Format):**
```json
{
  "text": "That's a common mistake! Remember, the angle of the incline is the same as the angle between Fg and the perpendicular component. Which trig function uses the side opposite the angle? [DIAGRAM: FBD_COMPONENTS_BREAKDOWN]",
  "action": "GUIDE",
  "handoff_flag": false
}
```
The Frontend then sees `[DIAGRAM: FBD_COMPONENTS_BREAKDOWN]`, calls the Diagram Service with the problem parameters, and displays the resulting FBD image inline with the text.
