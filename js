/*
 * reminders.js
 * ------------
 * Adds an in-browser reminder/scheduling capability to JARVIS.
 * Include this file in dashboard.html with:
 *   <script src="reminders.js"></script>
 * before the main <script> block that defines TOOLS and runTool.
 *
 * This does NOT make phone calls or book reservations anywhere —
 * it only sets a timer in this browser tab that speaks a reminder
 * out loud (and shows a desktop notification) at the time you asked for.
 * The page needs to stay open in a tab for a reminder to fire.
 */

const JarvisReminders = (function () {
  let reminders = []; // { id, text, whenMs, timeoutId }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  requestNotificationPermission();

  function fireReminder(reminder) {
    const message = `Reminder: ${reminder.text}`;
    if (typeof addMessage === 'function') addMessage('Jarvis', message);
    if (typeof speak === 'function') speak(message);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('JARVIS Reminder', { body: reminder.text });
    }
    reminders = reminders.filter(r => r.id !== reminder.id);
  }

  // whenIso: an ISO 8601 datetime string, e.g. "2026-08-16T15:00:00"
  function setReminder(text, whenIso) {
    const target = new Date(whenIso);
    if (isNaN(target.getTime())) {
      return `I couldn't understand that time.`;
    }
    const delay = target.getTime() - Date.now();
    if (delay <= 0) {
      return `That time has already passed.`;
    }

    const id = Date.now() + Math.random();
    const timeoutId = setTimeout(() => fireReminder({ id, text }), delay);
    reminders.push({ id, text, whenMs: target.getTime(), timeoutId });

    const timeStr = target.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
    return `Reminder set: "${text}" at ${timeStr}.`;
  }

  function listReminders() {
    if (!reminders.length) return "You don't have any reminders set.";
    const lines = reminders
      .sort((a, b) => a.whenMs - b.whenMs)
      .map(r => `"${r.text}" at ${new Date(r.whenMs).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`);
    return "Upcoming reminders: " + lines.join("; ");
  }

  function cancelReminder(text) {
    const match = reminders.find(r => r.text.toLowerCase().includes(text.toLowerCase()));
    if (!match) return `I couldn't find a reminder matching "${text}".`;
    clearTimeout(match.timeoutId);
    reminders = reminders.filter(r => r.id !== match.id);
    return `Cancelled reminder: "${match.text}".`;
  }

  return { setReminder, listReminders, cancelReminder };
})();

// ---- Tool definitions to merge into your main TOOLS array in dashboard.html ----
const REMINDER_TOOLS = [
  {
    type: "function",
    function: {
      name: "set_reminder",
      description: "Set a reminder that will be spoken aloud at a specific future time.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "What to remind the user about" },
          when_iso: { type: "string", description: "ISO 8601 datetime for when to remind, e.g. 2026-08-16T15:00:00" }
        },
        required: ["text", "when_iso"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_reminders",
      description: "List all upcoming reminders.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_reminder",
      description: "Cancel a reminder by matching text.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "Text to match against existing reminders" } },
        required: ["text"]
      }
    }
  }
];

// ---- Call this from your runTool() dispatcher in dashboard.html ----
// Returns null if the tool name isn't a reminder tool, so you can fall
// through to your other tool handlers.
async function runReminderTool(call) {
  const args = JSON.parse(call.function.arguments || "{}");
  if (call.function.name === "set_reminder") return JarvisReminders.setReminder(args.text, args.when_iso);
  if (call.function.name === "list_reminders") return JarvisReminders.listReminders();
  if (call.function.name === "cancel_reminder") return JarvisReminders.cancelReminder(args.text);
  return null;
}
