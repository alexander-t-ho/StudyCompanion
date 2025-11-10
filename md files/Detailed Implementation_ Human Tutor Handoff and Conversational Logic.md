# Detailed Implementation: Human Tutor Handoff and Conversational Logic

This document details the critical process of handing off a student from the AI Tutor to a human tutor and refines the conversational logic.

---

## 1. Human Tutor Handoff Protocol

The goal is to ensure that the human tutor receives the student's context instantly, allowing them to pick up the conversation seamlessly without asking the student to repeat themselves.

### A. Handoff Triggers (Refined)

The Backend API continuously monitors the AI Tutor's output and the student's session data for these triggers:

| Trigger | Threshold/Condition | AI Tutor Action |
| :--- | :--- | :--- |
| **High Interaction Count** | > 10 conversational turns on a single problem. | AI recommends handoff to Backend. |
| **No Progress** | Student's mastery score for the sub-topic has not increased after 3 consecutive attempts/guidance sessions. | AI recommends handoff to Backend. |
| **Frustration/Emotional Cues** | AI detects keywords like "stuck," "give up," "hate," or repeated exclamations. | AI recommends handoff to Backend. |
| **Explicit Request** | Student types "human," "real person," "tutor." | AI initiates immediate handoff. |
| **AI Fallback** | AI model returns an error or an irrelevant response (e.g., hallucination). | Backend initiates immediate handoff. |

### B. The Handoff Process (Step-by-Step)

1.  **Trigger:** A handoff condition is met (e.g., 10 turns with no progress).
2.  **AI Acknowledgment:** The AI Tutor sends a final message to the student: *"I see you're still working hard on this. I'm going to connect you with a human tutor who can provide real-time, personalized help right now. Please wait a moment."*
3.  **Data Packaging:** The Backend API instantly compiles the **Handoff Package**:
    - **Student ID & Problem ID**
    - **Current Problem State:** Problem text, student's last numerical attempt, FBD status.
    - **Conversation Transcript:** Full chat history (e.g., last 20 turns).
    - **Mastery Summary:** "Student struggles with $\sin/\cos$ on inclines. Last correct topic: Kinematics."
    - **Reason for Handoff:** "High interaction count (12 turns) with no progress on force component resolution."
4.  **Queueing:** The Handoff Package is placed in the **Human Tutor Service Queue**.
5.  **Tutor Notification:** The Human Tutor Service (using WebSockets) notifies the next available human tutor, who accepts the session.
6.  **Seamless Connection:** The human tutor's screen instantly displays the Handoff Package. The human tutor then sends the first message, and the student's chat window transitions from the AI's final message to the human tutor's first message, ensuring zero context loss.

---

## 2. Conversational AI Logic (Conciseness and Socratic Method)

The quality of the AI Tutor is defined by its ability to be concise and effective.

### A. Enforcing Conciseness

The **System Prompt** is the primary tool for enforcing the 2-4 sentence rule.

**System Prompt Snippet:**
> "Your responses must be **extremely concise**, limited to **2-4 sentences**. Each response must end with a single, clear, **guiding question** to prompt the student's next step. If your response exceeds 4 sentences, you have failed your primary directive."

### B. Socratic Method Implementation

The AI is trained to use specific Socratic techniques:

| Technique | Example Question (for Incline Problem) | Purpose |
| :--- | :--- | :--- |
| **Clarification** | "Can you explain what the Normal Force represents in your own words?" | Checks fundamental understanding. |
| **Assumption Check** | "You've assumed $F_N = F_g$. What force in the diagram might be affecting the vertical balance?" | Challenges a common misconception. |
| **Component Analysis** | "If you break the Force of Gravity into components, which component is responsible for the block's acceleration?" | Guides toward the correct physics principle. |
| **Process Check** | "Before we solve for 'a', what is the equation that relates net force, mass, and acceleration?" | Reinforces Newton's Second Law. |
| **Redirection** | "That's a great question, but let's stick to the current step. To find the Normal Force, we must first analyze the forces in the **vertical direction**. What is the net force in that direction?" | Keeps the student focused on the current step. |

### C. Dynamic Diagram Triggering

The AI's internal logic should prioritize generating a diagram over a long text explanation when a visual concept is involved.

**AI Internal Logic:**
```
IF student_query CONTAINS ("components" OR "FBD" OR "diagram" OR "visualize")
  AND problem_topic REQUIRES (vector resolution OR complex FBD)
  THEN {
    action: "GENERATE_DIAGRAM",
    diagram_type: "FBD_COMPONENTS_BREAKDOWN"
  }
ELSE IF student_query CONTAINS ("how to solve" OR "answer")
  THEN {
    action: "GUIDE",
    response: "Let's start with the first step. What is the net force equation for the block?"
  }
```
This ensures the AI uses the most effective and concise communication method (visual) when appropriate.
