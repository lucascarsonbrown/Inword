/**
 * Goal Progress Service
 *
 * Updates individual goal progress in the database with AI-generated
 * progress percentages and encouraging messages.
 */

import { updateGoal, Goal } from "./database";
import { GoalsProgressKB } from "@/types/kb-types";

export interface GoalProgressData {
  percent: number;
  message: string;
  momentum_score: number;
}

/**
 * Parse and format AI progress data from KB into a user-friendly message
 */
function formatProgressMessage(
  goalText: string,
  progressPercent: number,
  progressNotes: string[],
  nextActions: string[],
  risksBlockers: string[],
  momentumScore: number
): string {
  const messages = [];

  // Opening encouraging statement based on percentage
  if (progressPercent === 0) {
    messages.push("🌱 You're at the starting line! Every journey begins with a single step.");
  } else if (progressPercent < 20) {
    messages.push(`🌱 You're ${progressPercent}% of the way there! Your journey has begun.`);
  } else if (progressPercent < 40) {
    messages.push(`🌿 ${progressPercent}% complete! You're building momentum.`);
  } else if (progressPercent < 60) {
    messages.push(`🌳 You're ${progressPercent}% there! You've crossed the midpoint.`);
  } else if (progressPercent < 80) {
    messages.push(`🚀 ${progressPercent}% complete! The finish line is in sight!`);
  } else if (progressPercent < 100) {
    messages.push(`✨ ${progressPercent}% done! You're almost there!`);
  } else {
    messages.push(`🎉 Goal achieved! You've reached 100%!`);
  }

  // Add progress notes if any
  if (progressNotes.length > 0) {
    const recentProgress = progressNotes.slice(-2).join(". ");
    messages.push(`\n\nRecent progress: ${recentProgress}`);
  }

  // Add momentum indicator
  if (momentumScore >= 7) {
    messages.push("\n\n🔥 You have strong momentum! Keep it up!");
  } else if (momentumScore >= 4) {
    messages.push("\n\n💪 Steady progress. Stay consistent!");
  } else if (momentumScore >= 1) {
    messages.push("\n\n🌤️ Progress is slow but steady.");
  } else {
    messages.push("\n\n💭 This goal needs more attention.");
  }

  // Add next action if available
  if (nextActions.length > 0) {
    const topAction = nextActions[0];
    messages.push(`\n\nNext step: ${topAction}`);
  }

  // Add blocker warning if any
  if (risksBlockers.length > 0) {
    const blocker = risksBlockers[0];
    messages.push(`\n\n⚠️ Watch out for: ${blocker}`);
  }

  return messages.join("");
}

/**
 * Parse goal progress data into a structured format
 */
export function parseGoalProgress(aiProgressJson: string | null): GoalProgressData | null {
  if (!aiProgressJson) return null;

  try {
    const data = JSON.parse(aiProgressJson);
    return {
      percent: data.percent || 0,
      message: data.message || "",
      momentum_score: data.momentum_score || 0,
    };
  } catch (error) {
    console.error("Error parsing goal progress JSON:", error);
    return null;
  }
}

/**
 * Update all goals with AI progress data from KB
 * This is called after KB is updated with new journal entry
 */
export async function updateGoalProgressFromKB(
  goals: Goal[],
  goalsProgressKB: GoalsProgressKB
): Promise<void> {
  console.log("📊 Updating goal progress in database...");

  try {
    const updates = goals.map(async (goal) => {
      // Find progress data for this goal in KB
      const progressData = goalsProgressKB.goals.find((gp) => gp.goal_id === goal.id);

      if (!progressData) {
        console.log(`  ⚠️ No progress data found for goal: ${goal.text}`);
        return;
      }

      // Format the progress message
      const message = formatProgressMessage(
        goal.text,
        progressData.progress_percent,
        progressData.progress_notes,
        progressData.next_actions,
        progressData.risks_blockers,
        progressData.momentum_score
      );

      // Create JSON structure to store in ai_progress field
      const progressJson = JSON.stringify({
        percent: progressData.progress_percent,
        message: message,
        momentum_score: progressData.momentum_score,
        updated_at: new Date().toISOString(),
      });

      // Update goal in database
      console.log(`  📝 Updating goal: ${goal.text} (${progressData.progress_percent}%)`);
      await updateGoal(goal.id, {
        ai_progress: progressJson,
      });
    });

    await Promise.all(updates);
    console.log("✅ Goal progress updated successfully");
  } catch (error) {
    console.error("Error updating goal progress:", error);
    throw error;
  }
}

/**
 * Generate encouraging message based on progress percentage
 * Used for quick display without full KB context
 */
export function getEncouragingMessage(percent: number): string {
  if (percent === 0) {
    return "Every journey begins with a single step. You've got this!";
  } else if (percent < 20) {
    return "You've taken the first steps. Keep building momentum!";
  } else if (percent < 40) {
    return "You're making real progress. Stay consistent!";
  } else if (percent < 60) {
    return "You're over halfway there! The finish line is getting closer.";
  } else if (percent < 80) {
    return "You're in the home stretch! Keep pushing forward.";
  } else if (percent < 100) {
    return "So close! You can see the finish line from here!";
  } else {
    return "Goal achieved! Time to celebrate and set new horizons!";
  }
}
