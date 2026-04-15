export interface ProseForgeEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}
