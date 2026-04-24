// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContentItem = {
  type: 'video'|'text'|'slideshow'|'file'|'embed'|'quiz'|'assignment'|'image'|'pdf'|'audio'|'interactive_video'|'code_sandbox'|'label'|'survey'|'whiteboard'|'3d_model';
  title: string;
  data: any;
  id?: string;
};
