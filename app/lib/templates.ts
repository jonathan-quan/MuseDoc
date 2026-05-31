// Starting points offered by the Drive "New" menu. Each template seeds a new
// document with a title and some editor HTML; "blank" is the empty default.

export type Template = {
  id: string;
  label: string;
  description: string;
  title: string;
  html: string;
};

export const templates: Template[] = [
  {
    id: "blank",
    label: "Blank document",
    description: "Start from an empty page",
    title: "Untitled document",
    html: "<p></p>",
  },
  {
    id: "letter",
    label: "Letter",
    description: "A formal letter layout",
    title: "Letter",
    html: [
      "<p>[Your Name]</p>",
      "<p>[Street Address]</p>",
      "<p>[City, State ZIP]</p>",
      "<p></p>",
      "<p>[Date]</p>",
      "<p></p>",
      "<p>Dear [Recipient],</p>",
      "<p></p>",
      "<p>[Write your message here.]</p>",
      "<p></p>",
      "<p>Sincerely,</p>",
      "<p>[Your Name]</p>",
    ].join(""),
  },
  {
    id: "resume",
    label: "Resume",
    description: "A simple one-page resume",
    title: "Resume",
    html: [
      "<h1>[Your Name]</h1>",
      "<p>[Email] · [Phone] · [City, State] · [Website]</p>",
      "<h2>Summary</h2>",
      "<p>[One or two sentences about who you are and what you do.]</p>",
      "<h2>Experience</h2>",
      "<h3>[Job Title] — [Company]</h3>",
      "<p>[Dates]</p>",
      "<ul><li>[Accomplishment or responsibility]</li><li>[Accomplishment or responsibility]</li></ul>",
      "<h2>Education</h2>",
      "<h3>[Degree] — [School]</h3>",
      "<p>[Dates]</p>",
      "<h2>Skills</h2>",
      "<p>[Skill, Skill, Skill]</p>",
    ].join(""),
  },
  {
    id: "meeting",
    label: "Meeting notes",
    description: "Agenda, notes, and action items",
    title: "Meeting notes",
    html: [
      "<h1>Meeting notes</h1>",
      "<p><strong>Date:</strong> [Date] · <strong>Attendees:</strong> [Names]</p>",
      "<h2>Agenda</h2>",
      "<ul><li>[Topic]</li><li>[Topic]</li></ul>",
      "<h2>Notes</h2>",
      "<p>[Discussion points.]</p>",
      "<h2>Action items</h2>",
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">[Owner — task]</li><li data-type="taskItem" data-checked="false">[Owner — task]</li></ul>',
    ].join(""),
  },
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((template) => template.id === id);
}
